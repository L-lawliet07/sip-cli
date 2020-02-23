///////////////////////////////////////////
//@author : Mandeep Bisht
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
                // Making a https get request to node api
                const req = https.get(`https://api.npms.io/v2/search/suggestions?q=${input}`, (resp) => {

                    let data = '';
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    resp.on('end', () => {
                        data = JSON.parse(data);
                        const real_data = data.map((el) => {
                            return el.package.name + '@' + el.package.version;
                        });
                        return resolve(real_data);
                    });
                });

                req.on('error', function (err) {
                    reject(err);
                });

                req.end();
            });
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
        ])
}



/*****************
 * Function to execute install statement
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
    for (let i = 0; i < number_of_packages; ++i) {
        console.log('+ ' + packages[i]);
        row_options.push({ name: packages[i], value: i });
    }

    ////////////////////////////////////////
    // Function to get scope options(local or global)
    const scopes = (await getScope(row_options)).scope;

    ////////////////////////////////////////
    // Function to get dependencies option
    const dep_option = (await getDepOption(row_options)).dependencies;

    ////////////////////////////////////////
    // Creating commands
    const commands = [];
    for (let i = 0; i < number_of_packages; ++i) {
        const command = `npm install ${packages[i]} ${scopes[i] ? '' : scopes[i]} ${dep_option[i] ? '' : dep_option[i]}`;
        commands.push(command);
    }

    ////////////////////////////////////////
    //Promosifing exec command
    const exec_command = util.promisify(exec);

    for (let i = 0; i < number_of_packages; ++i) {
        const spinner = ora(`Installing ${packages[i]}`).start();

        setTimeout(() => {
            spinner.color = 'red';
            spinner.text = `Installing ${packages[i]}`;
        }, 1000);
        try {
            const { stdout, stderr } = await exec_command(commands[i]);
            if (stderr) {
                spinner.warn(`Installed ${packages[i]}`);
                console.log(stderr)
            } else {
                spinner.succeed(`Installed ${packages[i]}`);
                console.log(stdout);
            }
        } catch (err) {
            spinner.fail(`Error installing ${packages[i]}`);
            console.log(err.stderr);
        }
    }
}

module.exports = {
    main
}
