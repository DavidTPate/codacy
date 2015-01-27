#!/usr/bin/env node
(function (program, logDriver, util, lib, getGitData, Q) {
    'use strict';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    var input = '';

    process.stdin.on('data', function (chunk) {
        input += chunk;
        logDriver.logger.trace('Got chunk');
    });

    program
        .version('0.0.6')
        .usage('[options]')
        .option('-f, --format [value]', 'Coverage input format')
        .option('-t, --token [value]', 'Set Token')
        .option('-c, --commit [value]', 'Set Commit Id')
        .option('-e, --endpoint [value]', 'Set Endpoint')
        .option('-v, --verbose', 'Display verbose output')
        .option('-d, --debug', 'Display debug output')
        .parse(process.argv);

    logDriver({
        verbose: program.verbose,
        debug: program.debug
    });

    logDriver.logger.info(util.format('Started with: token [%j], commitId [%j], endpoint [%j], format [%j], verbose [%j], debug [%j]', program.token, program.commit, program.endpoint, program.format, program.verbose, program.debug));

    process.stdin.on('end', function () {
        logDriver.logger.trace('Received file through stdin');

        if (program.help === true) {
            return;
        }

        var token = program.token || process.env.CODACY_REPO_TOKEN,
            commitId = program.commit,
            format = program.format || 'lcov';

        if (!token) {
            return logDriver.logger.error(new Error('Token is required'));
        }

        // Parse the coverage data for the given format and retrieve the commit id if we don't have it.
        return Q.all([lib.getParser(format).parse(input), getGitData.getCommitId(commitId)]).spread(function (parsedCoverage, commitId) {
            // Now that we've parse the coverage data to the correct format, send it to Codacy.
            logDriver.logger.trace(parsedCoverage);
            lib.reporter({
                endpoint: program.endpoint
            }).sendCoverage(token, commitId, parsedCoverage).then(function () {
                logDriver.logger.debug('Successfully sent coverage');
            }, function (err) {
                logDriver.logger.error('Error sending coverage');
                logDriver.logger.error(err);
            });
        }, function (err) {
            logDriver.logger.error(err);
        });
    });

}(require('commander'), require('log-driver'), require('util'), require('../index'), require('../lib/getGitData'), require('q')));