#!/usr/bin/env node

const { parseArgs } = require("node:util");
const { readFile, writeFile } = require('node:fs/promises');
//const { JSDOM } = require("jsdom");

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
    process.argv[1],
    "[ --save-path FILE | --from-file FILE ]",
    "[ --mode vanilla | jsdom ] ",
    "[ --debug ] [ --help ] URL"
  );
  console.log();
  console.log("The following arguements are supported:");
  for (const [cmd, val] of Object.entries(options)) {
    console.log(`--${cmd}, -${val.short}\t: ${val.type}\t ${val.info}`);
  }
  console.log();
  console.log("** A URL is ALWAYS required in order to process relative links.");
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
};

const getProtocol = str => {
  const url = new URL(str);
  return url.protocol
}

if (args.values.help) printHelp();
if (!args.positionals[0]) throw new Error("Must provide a URL");
const target = args.positionals[0];
if (!isValidHttpUrl(target)) throw new Error(`Invalid HTTP(S) URL: ${target}`);

const targetURL = new URL(target);
const protocol = targetURL.protocol;
const origin = targetURL.origin;


if (args.values["save-file"] && args.values["from-file"]) throw new Error("Invalid save / load combination");


(async ()=>{
  let text, found;
  if (args.values["from-file"]) {
    html = await readFile(args.values["from-file"], 'utf-8');
  } else {
    const resp = await fetch(target);
    html = await resp.text();
    if (args.values["save-file"]) await writeFile(args.values["save-file"], html);
  }

  if (args.values.mode === "jsdom") {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(html, {url: target});
    const anchors = [].slice.call(dom.window.document.getElementsByTagName("a"));
    found = anchors.map( element => {
      (element.href) && console.log(element.href)
      return element.href;
    });
  } else if (args.values.mode === "vanilla") {

    // wiki.html: 329

    const script_tag_reg = /< *script([\s\S]*?)<\/script>/g;
    const style_tag_reg = /< *style([\s\S]*?)<\/style>/g;
    const html_cmt_reg = /(\<!--([\s\S]*?)\-->)/g;
    html = html.replace(script_tag_reg,"");
    html = html.replace(style_tag_reg,"");
    html = html.replace(html_cmt_reg,"");
    //const star_cmt_reg = /\/\*([\s\S]*?)\*\//g;
    //const slash_cmt_reg = /\/\/.*?/g;
    //html = html.replace(star_cmt_reg,"");
    //html = html.replace(slash_cmt_reg,"");
    const a_tag_reg = /< *a ([\s\S]*?)>/g;
    found = html.match(a_tag_reg).filter(a=> ( a.includes("href=") && !a.includes(`href=''`) && !a.includes(`href=""`) ) ).map(a=>{

      // this almost worked, but there is an issue with multiline <a> declarations
      //let h = a.replace(/.*href=(?:'|")(.*?)(?:'|").*/, "$1");

      // split each <a> up by single or double quotes
      const anchorSplitArr = a.split(/['"]/);
      // find the index for the attribute declaration `href`
      const hrefIDX = anchorSplitArr.findIndex(s=>s.endsWith("href="));
      // the url is the next item
      let h = anchorSplitArr[hrefIDX+1];
      
      // yahoo.com html encodes characters with hex values. solution from:
      // https://stackoverflow.com/questions/25607969/how-to-decode-hex-code-of-html-entities-to-text-in-javascript#34563338
      h = h.replace(/&#x([a-fA-F0-9]+);/g, (match, group1) => {
        const num = parseInt(group1, 16);
        return String.fromCharCode(num);
      });
      if (h.startsWith('//')) {
        h = protocol + h;
      } else if (h.startsWith('#')) {
        h = target + h
      } else if ((h.includes('#')) && (!h.includes("://"))) {
        const basePath = target.substring(0, target.lastIndexOf('/'));
        h = basePath + "/" + h;
      } else if (h.startsWith("/")) {
        h = origin + h;
      } else if (!h.includes(":")) {
        h = origin + '/' + h;
      }
      console.log(h);
      return(h);
    });
  }
  console.log(found.length);
})()


