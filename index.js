///////////////////////////////////////////
//@author: Mandeep Bisht
///////////////////////////////////////////

'use strict'

/*****************
 * Require Statements
 */

const util = require('util');

const { exec } = require('child_process');

const https = require('https');

const readline = require('readline')

const inquirer = require('inquirer');

//inquirer checkbox plugin
const checkbox = require('inquirer-checkbox-plus-prompt');

//inquirer table plugin
const table = require("inquirer-table-prompt");

//Spinner
const ora = require('ora');

const chalk = require('chalk');

const open = require('open');


// Global variable uses to map package name to the links
const mapping = {};

/*****************
 * Function to search and select packages
 */

function getPackage() {

    inquirer.registerPrompt('checkbox-plus', checkbox);

    return inquirer.prompt([{

        type: 'checkbox-plus',
        name: 'package',
        message: '🔍️  ' + chalk.blue.bold('Enter Package Name:'),
        pageSize: 5,
        highlight: true,
        searchable: true,
        validate: function (answer) {
            return true;
        },
        source: function (answersSoFar, input) {

            input = input || '';
            if (input == '') {
                return Promise.resolve([]);
            }

            return new Promise(function (resolve, reject) {

                /////////////////////////////////////////
                // Making a https get request to npms api
                const req = https.get(`https://api.npms.io/v2/search/suggestions?q=${input}`, (resp) => {

                    let data = '';
                    /////////////////////////////////////
                    // Receiving Data
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    /////////////////////////////////////
                    //Data received
                    resp.on('end', () => {

                        //Parsing json data
                        data = JSON.parse(data);
                        const real_data = data.map((el) => {
                            mapping[el.package.name + '@' + el.package.version] = {
                                'homepage': el.package.links.homepage,
                                'repository': el.package.links.repository,
                                'npm': el.package.links.npm
                            };
                            return el.package.name + '@' + el.package.version;
                        });
                        return resolve(real_data);
                    });

                });

                /////////////////////////////////////////
                // In case of error dont show anything
                req.on('error', function (err) {
                    //Return Empty Array
                    return resolve([]);
                });

                req.end();
            });

        }
    }]);
}



/*****************
 * Function to select scope
 */

function getScope(row_options) {


    inquirer.registerPrompt("table", table);

    return inquirer
        .prompt([
            {
                type: "table",
                name: "scope",
                message: '🎭️  ' + chalk.blue.bold("Choose Scope: "),
                columns: [
                    {
                        name: "Local",
                        value: ""
                    },
                    {
                        name: "Global",
                        value: "--global"
                    }
                ],
                rows: row_options
            }
        ]);
}



/*****************
 * Function to select dependency options
 */

function getDepOption(row_options) {

    return inquirer
        .prompt([
            {
                type: "table",
                name: "dependencies",
                message: '💀️  ' + chalk.blue.bold("Choose Installation Option:"),
                columns: [
                    {
                        name: "save-prod",
                        value: "--save-prod"
                    },
                    {
                        name: "save-dev",
                        value: "--save-dev"
                    },
                    {
                        name: "save-optional",
                        value: "--save-optional"
                    },
                    {
                        name: "no-save",
                        value: "--no-save"
                    }
                ],
                rows: row_options
            }
        ]);
}



/*****************
 * Function to listen to keypress event
 */

function keypress_listen(packages) {

    /////////////////////////////////////////
    // enabling stdin to emit events
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    /////////////////////////////////////////
    // listen to keypress event
    process.stdin.on('keypress', async (str, key) => {

        // Open homepage of packages (ctrl + w)
        if (key.ctrl && key.name === 'w') {
            for (let i = 0; i < packages.length; ++i) {
                if (mapping[packages[i]].homepage) {
                    await open(mapping[packages[i]].homepage);
                }
            }
        }

        // Open repository of packages (ctrl + r)
        if (key.ctrl && key.name === 'r') {
            for (let i = 0; i < packages.length; ++i) {
                if (mapping[packages[i]].repository) {
                    await open(mapping[packages[i]].repository);
                }
            }
        }

        // Open repository for particular package (ctrl + #)
        if (key.meta && key.name > '0' && key.name <= '9') {
            let index = parseInt(key.name) - 1;
            if (index < packages.length && mapping[packages[index]].repository) {
                await open(mapping[packages[index]].repository);
            }
        }
    });
}



/*****************
 * Main function
 */

async function main() {

    ////////////////////////////////////////
    // Function to get selected package
    const packages = (await getPackage()).package;

    const number_of_packages = packages.length;

    ////////////////////////////////////////
    // I no package is selected quit
    if (number_of_packages === 0) {

        console.log('🤷‍♂️️  ' + chalk.yellow.underline('No package selected '));
        process.exit(0);
    }

    keypress_listen(packages);

    const row_options = [];

    console.log(chalk.yellow('\n>>>>>'));

    console.log(chalk.blue.bold.underline('Selected Packages :'));

    for (let i = 0; i < number_of_packages; ++i) {
        console.log(chalk.green(' + ' + packages[i]));
        row_options.push({ name: packages[i], value: i });
    }

    console.log(chalk.yellow('>>>>>\n'));

    ////////////////////////////////////////
    // Function to get scope options(local or global)
    const scopes = (await getScope(row_options)).scope;

    ////////////////////////////////////////
    // Function to get dependencies option
    const dep_option = (await getDepOption(row_options)).dependencies;

    ////////////////////////////////////////
    //Promosifing exec command
    const exec_command = util.promisify(exec);

    for (let i = 0; i < number_of_packages; ++i) {

        console.log(chalk.yellow('\n>>>>>'));

        const command = `npm install ${packages[i]} ${scopes[i] ? scopes[i] : ''} ${dep_option[i] ? dep_option[i] : ''}`;

        console.log(chalk.blue.bold(`Executing : `) + command);

        const spinner = ora(`Installing ${packages[i]}`).start();

        setTimeout(() => {
            spinner.color = 'red';
            spinner.text = `Installing ${packages[i]} 🤺️`;
        }, 500);

        try {

            ////////////////////////////////////////////
            // Execute command
            const { stdout, stderr } = await exec_command(command);

            ////////////////////////////////////////////
            // If error occures
            if (stderr) {
                spinner.warn(`Warning ${packages[i]}`);
                console.log(chalk.yellow(stderr))
            }
            ////////////////////////////////////////////
            // In case of success
            else {
                spinner.succeed(`Installed ${packages[i]}`);
                console.log(chalk.green(stdout));
            }

        } catch (err) {
            spinner.fail(`Error installing ${packages[i]}`);
            console.log(chalk.red(err.stderr));
        }

        console.log(chalk.yellow('>>>>>\n'));
    }
    process.exit(0);
}



/*****************
 * Export Statement
 */

module.exports = {
    main
}