#!/usr/bin/python
#
# Highprofile fork stats
# pdr@google.com

from git import *
import datetime
from datetime import date
import time
import re
from collections import defaultdict
import os.path
from subprocess import *
import math
from collections import Counter

def getCommitsSince(repo, startDatetime, pathFilter=""):
    commits = repo.iter_commits("master", paths=pathFilter)
    commitsSinceStartDatetime = []
    for commit in commits:
        commitDatetime = datetime.datetime.utcfromtimestamp(commit.committed_date)
        day = (commitDatetime - startDatetime).days
        if (day < 0):
            break
        commitsSinceStartDatetime.append(commit)
    return commitsSinceStartDatetime

def getCommitsByDay(repo, startDatetime, pathFilter="", organizationFilter=None):
    commitsSince = getCommitsSince(repo, startDatetime, pathFilter)
    commitsByDay = defaultdict(list)
    for commit in commitsSince:
        if (organizationFilter and not organizationFilter == getOrganizationFromCommit(commit)):
            continue
        commitDatetime = datetime.datetime.utcfromtimestamp(commit.committed_date)
        day = (commitDatetime - startDatetime).days
        commitsByDay[day].append(commit)
    return commitsByDay

def writeCommitsByDay(blinkRepo, webkitRepo, startDatetime, outputFilename, sourceCorePathFilter):
    blinkCommitsByDay = getCommitsByDay(blinkRepo, startDatetime)
    blinkSourceCoreCommitsByDay = getCommitsByDay(blinkRepo, startDatetime, sourceCorePathFilter)
    webkitCommitsByDay = getCommitsByDay(webkitRepo, startDatetime)
    webkitSourceCoreCommitsByDay = getCommitsByDay(webkitRepo, startDatetime, sourceCorePathFilter)
    dateRange = range((datetime.datetime.now() - startDatetime).days + 1)
    commitsByDayFile = open(outputFilename, "w")
    commitsByDayFile.write("date,Blink,Webkit,Blink(core),Webkit(core)\n")
    blinkTotal = 0
    blinkSourceCoreTotal = 0
    webkitTotal = 0
    webkitSourceCoreTotal = 0
    for day in dateRange:
        date = (startDatetime + datetime.timedelta(day)).strftime("%Y%m%d")
        blinkTotal += len(blinkCommitsByDay[day])
        blinkSourceCoreTotal += len(blinkSourceCoreCommitsByDay[day])
        webkitTotal += len(webkitCommitsByDay[day])
        webkitSourceCoreTotal += len(webkitSourceCoreCommitsByDay[day])
        commitsByDayFile.write(date + "," + str(blinkTotal) + "," + str(webkitTotal) + ","
            + str(blinkSourceCoreTotal) + "," + str(webkitSourceCoreTotal) + "\n")

def writeCommitsMovingAverage(blinkRepo, webkitRepo, startDatetime, window, outputFilename, sourceCorePathFilter):
    startDatetime = startDatetime - datetime.timedelta(days=(2 * window - 1))
    blinkCommitsByDay = getCommitsByDay(blinkRepo, startDatetime, sourceCorePathFilter)
    webkitCommitsByDay = getCommitsByDay(webkitRepo, startDatetime, sourceCorePathFilter)
    commitsMovingAverageFile = open(outputFilename, "w")
    commitsMovingAverageFile.write("date,Blink(core),Webkit(core)\n")
    dateRange = range((datetime.datetime.now() - startDatetime).days + 1)
    for day in dateRange:
        if (day - 2 * window + 1 < 0): continue
        date = (startDatetime + datetime.timedelta(day)).strftime("%Y%m%d")
        blinkTotal = 0
        webkitTotal = 0
        for weightedMovingAverage in range(0, window):
            blinkTotal += (window - weightedMovingAverage) * len(blinkCommitsByDay[day - weightedMovingAverage])
            webkitTotal += (window - weightedMovingAverage) * len(webkitCommitsByDay[day - weightedMovingAverage])
        blinkMovingAverage = blinkTotal / (window * (window + 1) / 2)
        webkitMovingAverage = webkitTotal / (window * (window + 1) / 2)
        commitsMovingAverageFile.write(date + "," + str(blinkMovingAverage) + "," + str(webkitMovingAverage) + "\n")

def writeCommitsMovingAverageByOrganization(blinkRepo, webkitRepo, startDatetime, window, outputFilename, organizations, sourceCorePathFilter):
    startDatetime = startDatetime - datetime.timedelta(days=(2 * window - 1))
    organizationBlinkCommitsByDay = {}
    organizationWebkitCommitsByDay = {}
    commitsMovingAverageFile = open(outputFilename, "w")
    commitsMovingAverageFile.write("date")
    for i in range(0, len(organizations)):
        organization = organizations[i]
        commitsMovingAverageFile.write(",Blink(core) - " + organization + ",Webkit(core) - " + organization)
        organizationBlinkCommitsByDay[i] = getCommitsByDay(blinkRepo, startDatetime, sourceCorePathFilter, organization)
        organizationWebkitCommitsByDay[i] = getCommitsByDay(webkitRepo, startDatetime, sourceCorePathFilter, organization)
    commitsMovingAverageFile.write("\n")
    dateRange = range((datetime.datetime.now() - startDatetime).days + 1)
    for day in dateRange:
        if (day - 2 * window + 1 < 0): continue
        date = (startDatetime + datetime.timedelta(day)).strftime("%Y%m%d")
        organizationBlinkTotal = [0] * len(organizations)
        organizationWebkitTotal = [0] * len(organizations)
        for weightedMovingAverage in range(0, window):
            for i in range(0,len(organizations)):
                organization = organizations[i]
                organizationBlinkTotal[i] += (window - weightedMovingAverage) * len(organizationBlinkCommitsByDay[i][day - weightedMovingAverage])
                organizationWebkitTotal[i] += (window - weightedMovingAverage) * len(organizationWebkitCommitsByDay[i][day - weightedMovingAverage])
        commitsMovingAverageFile.write(date)
        for i in range(0,len(organizations)):
            organization = organizations[i]
            organizationBlinkTotal[i] =  organizationBlinkTotal[i] / (window * (window + 1) / 2)
            organizationWebkitTotal[i] =  organizationWebkitTotal[i] / (window * (window + 1) / 2)
            commitsMovingAverageFile.write("," + str(organizationBlinkTotal[i]) + "," + str(organizationWebkitTotal[i]))
        commitsMovingAverageFile.write("\n");


def getOrganizationFromCommit(commit):
    email = commit.author.email
    if ("commit-queue@webkit.org" in email):
        searchObj = re.search( r'Patch by .* <(.*)> on .*', commit.message, re.M|re.I)
        if (searchObj):
            email = searchObj.group(1)

    # Independent contributors
    #   Patrick Gansterer / paroga
    #   robhogan@gmail.com
    #   costan@gmail.com / pwnall
    #   erik.corry@gmail.com
    #   changseok.oh@collabora.com
    #   Yoav Weiss / yaov
    #   martijn@martijnc.be
    #   mathias@qiwi.be

    # TODO: A few of these folks have switched organizations. For now, lets list them in their
    #       current organization. (e.g., rwlbuis)
    if ("chromium" in email or "google" in email or "mithro" in email or "chrishtr" in email or "abarth" in email):
        return "Google"
    if ("opera" in email):
        return "Opera"
    if ("samsung" in email or "eokju.kwon" in email or "cavalcantii" in email or "rwlbuis" in email):
        return "Samsung"
    if ("adobe" in email or "zoltan" in email or "andrei.prv" in email):
        return "Adobe"
    if ("intel" in email or "rakuco" in email):
        return "Intel"
    if ("yandex" in email):
        return "Yandex"
    if ("igalia" in email or "zandobersek" in email or "mrobinson" in email or "sergio@webkit" in email or "carlosgc@webkit" in email):
        return "Igalia"
    if ("access-company" in email):
        return "Access-company"
    if ("blackberry" in email or "@rim.com" in email):
        return "Blackberry"
    if ("nvidia" in email):
        return "Nvidia"
    if ("flexsim" in email):
        return "Flexsim"
    if ("openbossa" in email):
        return "Openbossa"
    if ("szeged" in email or "reni" in email):
        return "U. of Szeged"
    if ("company100" in email):
        return "company100"
    if ("fred.wang" in email):
        return "American Mathematical Society"
    if ("bloomberg" in email):
        return "Bloomberg"
    if ("allan.jensen@digia.com" in email):
        return "Digia"
    if ("collabora.co" in email):
        return "Collabora"
    if ("cisco" in email):
        return "Cisco"
    if ("cablelabs" in email):
        return "cablelabs"
    if ("fujitsu" in email):
        return "Fujitsu"
    if ("redhat" in email):
        return "Redhat"
    if ("apple" in email or "webkit.org" in email): # webkit.org catchall. All others should be represented above.
        return "Apple"
    return False

def writeCommitsByOrganization(repo, startDatetime, outputFilename, sourceCorePathFilter):
    minimumCommits = 50
    unknownOrganization = "Other"

    commits = getCommitsSince(repo, startDatetime, sourceCorePathFilter)
    commitsByOrganization = {};
    for commit in commits:
        organization = getOrganizationFromCommit(commit)
        if (not organization):
            organization = unknownOrganization
        if (not organization in commitsByOrganization):
            commitsByOrganization[organization] = 1
        else:
            commitsByOrganization[organization] = commitsByOrganization[organization] + 1

    # Strip out low-commit organizations to make the vis cleaner
    for organization in commitsByOrganization:
        if (commitsByOrganization[organization] < minimumCommits):
            commitsByOrganization[unknownOrganization] = commitsByOrganization[unknownOrganization] + commitsByOrganization[organization]
            commitsByOrganization[organization] = 0

    commitsByOrganizationFile = open(outputFilename, "w")
    commitsByOrganizationFile.write("Organization,commits\n")
    for organization in commitsByOrganization:
        if (commitsByOrganization[organization] == 0):
            continue
        commitsByOrganizationFile.write(organization)
        commitsByOrganizationFile.write(",")
        commitsByOrganizationFile.write(str(commitsByOrganization[organization]))
        commitsByOrganizationFile.write("\n")

def getLinesOfCodeByLanguage(dir, cloc, languageList):
    clocOutput = Popen(cloc + " " + dir + " --csv", stdout=PIPE, shell=True).stdout.read()
    linesOfCodeByLanguage = {}
    totalComments = 0
    totalLinesOfCode = 0
    for line in clocOutput.split('\n'):
        # CSV format: files,language,blank,comment,code
        columns = line.split(',')
        if (len(columns) == 5):
            language = columns[1]
            code = columns[4]
            totalLinesOfCode = totalLinesOfCode + int(code)
            if (language in languageList):
                linesOfCodeByLanguage[language] = code
                totalComments = totalComments + int(columns[3])
    linesOfCodeByLanguage["Comments"] = totalComments
    linesOfCodeByLanguage["Total lines of code"] = totalLinesOfCode
    return linesOfCodeByLanguage


def writeLinesOfCode(repoDir, repo, samples, startDatetime, cloc, outputFilename, languageList):
    if (not os.path.isfile(cloc)):
        print "cloc not found."
        return

    linesOfCodeFile = open(outputFilename, "w")
    linesOfCodeFile.write("date")
    for language in languageList:
        linesOfCodeFile.write(",")
        linesOfCodeFile.write(language)
    linesOfCodeFile.write("\n")

    commitsByDay = getCommitsByDay(repo, startDatetime)
    days = len(commitsByDay)
    dayRange = range(0, days, days / (samples - 1))
    dayRange.append(days)
    git = repo.git

    for startDay in dayRange:
        commit = None
        day = startDay
        while not commit and day <= days:
            if (len(commitsByDay[day]) > 0):
                commit = commitsByDay[day][0]
                break
            day = day + 1
        if not commit: break
        commitDate = datetime.datetime.utcfromtimestamp(commit.committed_date).strftime("%Y%m%d")
        print "  [" + commitDate + "] counting lines of code for " + commit.hexsha
        git.checkout(commit.hexsha, force=True)
        
        linesOfCodeFile.write(commitDate)
        linesOfCode = getLinesOfCodeByLanguage(repoDir + "/Source", cloc, languageList)
        for language in languageList:
            linesOfCodeFile.write(",")
            if language in linesOfCode:
                linesOfCodeFile.write(str(linesOfCode[language]))
            else:
                linesOfCodeFile.write("0")
        linesOfCodeFile.write("\n")
    # Reset repo to master state.
    git.checkout("master")


def writeTopFiles(repo, startDatetime, topFileCount, outputFilename, extensionFilter):
    commits = getCommitsSince(repo, startDatetime, "Source/")
    changeCounter = Counter()
    for commit in commits:
        files = commit.stats.files
        #fixme: this will double-count moves.
        for file in files:
            filename = os.path.basename(file)
            extension = os.path.splitext(filename)[1]
            if (extension in extensionFilter):
                changeCounter[filename] += 1
    topFilesFile = open(outputFilename, "w")
    topFilesFile.write("file,count\n")
    topFiles = changeCounter.most_common(topFileCount)
    for top in topFiles:
        topFilesFile.write(top[0] + "," + str(top[1]) + "\n")


def main():
    startDatetime = datetime.datetime(2013, 1, 1)
    forkDatetime = datetime.datetime(2013, 4, 3)
    blinkDir = "../chromium/src/third_party/WebKit"
    blinkRepo = Repo(blinkDir)
    webkitDir = "../WebKit"
    webkitRepo = Repo(webkitDir)
    cloc = "./cloc-1.60.pl"

    # Path filter to separate out "non-core" changes.
    # SourceCorePathFilter is all code that directly contributes to the rendering engine but not
    # JavaScriptCore or V8, not inspector or devtools, etc. Some of these are not directly
    # comparable across the projects (e.g., Source/WebKit and Source/WebKit2 don't exist in Blink).
    sourceCorePathFilter = ["Source/wtf", "Source/WTF", "Source/platform", "Source/Platform"
                           ,"Source/modules", "Source/heap", "Source/core", "Source/bindings"
                           ,"Source/WebCore", "Source/WebKit", "Source/WebKit2", "Source/bmalloc"]


    print "Computing commits by day..."
    #writeCommitsByDay(blinkRepo, webkitRepo, startDatetime, "commitsByDay.csv", sourceCorePathFilter)
    #print "  done!"

    print "Counting lines of code"
    languageList = ["Total lines of code", "Comments", "Perl", "IDL", "C/C++ Header", "Assembly"
                    ,"Objective C", "Python", "Objective C++", "Javascript", "C", "C++"]
    samples = 160 # number of times to count lines of code
    #writeLinesOfCode(blinkDir, blinkRepo, samples, startDatetime, cloc, "blinkLinesOfCode.csv", languageList)
    #writeLinesOfCode(webkitDir, webkitRepo, samples, startDatetime, cloc, "webkitLinesOfCode.csv", languageList)
    print "  done!"

    #print "Computing commits by organization..."
    #writeCommitsByOrganization(blinkRepo, forkDatetime, "blinkCommitsByOrganization.csv", sourceCorePathFilter)
    #writeCommitsByOrganization(webkitRepo, forkDatetime, "webkitCommitsByOrganization.csv", sourceCorePathFilter)
    #print "  done! Wrote {blink,webkit}CommitsByOrganization.csv"

    print "Computing commits per day moving averages..."
    #averageCommitsPerDayFilename = "averageCommitsByDay.csv"
    #averageCommitsPerDayByOrganizationFilename = "averageCommitsByDayByOrganization.csv"
    #averagingWindow = 1 # days
    #organizationFilter = ["Google", "Apple", "Samsung", "Opera"]
    #writeCommitsMovingAverage(blinkRepo, webkitRepo, startDatetime, averagingWindow,
    #    averageCommitsPerDayFilename, sourceCorePathFilter)
    #writeCommitsMovingAverageByOrganization(blinkRepo, webkitRepo, startDatetime, averagingWindow,
    #    averageCommitsPerDayByOrganizationFilename, organizationFilter, sourceCorePathFilter)
    #print "  done! Wrote " + averageCommitsPerDayFilename + " and " + averageCommitsPerDayByOrganizationFilename

    print "Computing top files..."
    topFileCount = 200
    topFileExtensionFilter = [".h", ".cpp", ".c", ".idl", ".mm"]
    #writeTopFiles(blinkRepo, datetime.datetime(2014,1,1), topFileCount, "blinkTopFiles.csv", topFileExtensionFilter)
    #writeTopFiles(webkitRepo, datetime.datetime(2014,1,1), topFileCount, "webkitTopFiles.csv", topFileExtensionFilter)
    print "  done!"

if __name__ == '__main__':
  main()