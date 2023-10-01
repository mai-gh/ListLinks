#!/usr/bin/env node

const { parseArgs } = require("node:util");

const options = {
  "save-file": {
    type: "string",
    short: "S",
    info: 'Specify where you want to save the file. Ex: --save-file "/path/to/file.html".',
  },
  "from-file": {
    type: "string",
    short: "f",
    info: 'Specify which file you want to open. Ex: --from-file "/path/to/file.html".',
  },
  mode: {
    type: "string",
    short: "m",
    info: "Link parsing mode. either 'vanilla' or 'jsdom'. Defaults to 'vanilla'.",
  },
  debug: {
    type: "boolean",
    short: "v",
    info: "Print extra info. Defaults to false.",
  },
  help: {
    type: "boolean",
    short: "m",
    info: "Print this help message.",
  },
};

const args = parseArgs({
  allowPositionals: true,
  options,
});

const printHelp = () => {
  console.log();
  console.log(
    `${process.argv[1]} [ --save-path FILE | --from-file FILE ] [ --mode vanilla | jsdom ] [ --debug ] [ --help ] URL`,
  );
  console.log();
  console.log("The following arguements are supported:");
  for (const [cmd, val] of Object.entries(options)) {
    console.log(`--${cmd}, -${val.short}\t: ${val.type}\t ${val.info}`);
  }
  console.log();
  console.log( "** A URL is ALWAYS required in order to process relative links.");
  console.log();
  process.exit();
};

const isValidHttpUrl = (string) => {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

if (args.values.help) printHelp();
if (!args.positionals[0]) throw new Error("Must provide a URL");
const target = args.positionals[0];
if (!isValidHttpUrl(target)) throw new Error(`Invalid HTTP(S) URL: ${target}`);

if (args.values["save-page"] && args.values["from-file"])
  throw new Error("Invalid save / load combination");

//filename = filename.replace(/[/\\?%*:|"<>]/g, '-');

/*
(async ()=>{
  const resp = await fetch('https://wikipedia.org');
  const text = await resp.text();
  console.log(text);
})()

*/
