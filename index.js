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

const inquirer = require('inquirer');

//inquirer checkbox plugin
const checkbox = require('inquirer-checkbox-plus-prompt');

//inquirer table plugin
const table = require("inquirer-table-prompt");

//Spinner
const ora = require('ora');

const chalk = require('chalk');



/*****************
 * Function to search and select packages
 */

function getPackage() {

    inquirer.registerPrompt('checkbox-plus', checkbox);

    return inquirer.prompt([{

        type: 'checkbox-plus',
        name: 'package',
        message: 'Enter Package Name:',
        pageSize: 5,
        highlight: true,
        searchable: true,
        validate: function (answer) {
            return true;
        },
        source: function (answersSoFar, input) {

            input = input || '';
            if (input == '') return Promise.resolve([]);
            return new Promise(function (resolve, reject) {

                /////////////////////////////////////////
                // Making a https get request to npms api
                const req = https.get(`https://api.npms.io/v2/search/suggestions?q=${input}`, (resp) => {

                    let data = '';
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    /////////////////////////////////////
                    //Data received
                    resp.on('end', () => {

                        data = JSON.parse(data);
                        const real_data = data.map((el) => {
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
            })

        }
    }])
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
                message: "Choose Scope",
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
        ])
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
                message: "Choose Installation Option:",
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
 * Main function
 */

async function main() {

    ////////////////////////////////////////
    // Function to get selected package
    const packages = (await getPackage()).package;

    const number_of_packages = packages.length;

    ////////////////////////////////////////
    // I no package is selected quit
    if (number_of_packages === 0) return;

    const row_options = [];

    console.log(chalk.yellow('\n>>>>>'));

    console.log(chalk.blue.bold('Selected Packages :'));

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
            spinner.text = `Installing ${packages[i]}`;
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
}



/*****************
 * Require Statements
 */

module.exports = {
    main
}