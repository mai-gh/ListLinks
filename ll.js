#!/usr/bin/env node

const { parseArgs } = require("node:util");
const { readFile, writeFile } = require("node:fs/promises");

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
    default: "vanilla"
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
    "[ --help ] URL",
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

const getProtocol = (str) => {
  const url = new URL(str);
  return url.protocol;
};

if (args.values.help) printHelp();
if (!args.positionals[0]) throw new Error("Must provide a URL");
const target = args.positionals[0];
if (!isValidHttpUrl(target)) throw new Error(`Invalid HTTP(S) URL: ${target}`);

const targetURL = new URL(target);
const protocol = targetURL.protocol;
const origin = targetURL.origin;
const basePath = ((!target.endsWith('/')) && ((target.match(/\//g) || []).length == 2)) ? target : target.substring(0, target.lastIndexOf("/"));

if (args.values["save-file"] && args.values["from-file"]) throw new Error("Invalid save / load combination");

(async () => {
  let text, found;
  if (args.values["from-file"]) {
    html = await readFile(args.values["from-file"], "utf-8");
  } else {
    const resp = await fetch(target);
    html = await resp.text();
    if (args.values["save-file"]) await writeFile(args.values["save-file"], html);
  }

  if (args.values.mode === "jsdom") {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(html, { url: target });
    const anchors = [].slice.call(dom.window.document.getElementsByTagName("a"));
    found = anchors.map(el => el.href );
  } else if (args.values.mode === "vanilla") {
    const script_tag_reg = /< *script([\s\S]*?)<\/script>/g;
    const style_tag_reg = /< *style([\s\S]*?)<\/style>/g;
    const a_tag_reg = /< *a ([\s\S]*?)>/g;
    const html_cmt_reg = /(\<!--([\s\S]*?)\-->)/g;
    html = html.replace(script_tag_reg, "");
    html = html.replace(style_tag_reg, "");
    html = html.replace(html_cmt_reg, "");
    found = html
      .match(a_tag_reg)
      .filter(a => a.includes("href=") && !a.includes(`href=''`) && !a.includes(`href=""`))
      .map(a => {

        // fix html encoded quotes since we need them.
        a = a.replace(/&quot;/g, `"`);
        a = a.replace(/&apos;/g, `'`);


        // split each <a> up by single or double quotes
        const anchorSplitArr = a.split(/['"]/);
        // find the index for the attribute declaration `href`
        const hrefIDX = anchorSplitArr.findIndex((s) => s.endsWith("href="));
        // the url is the next item
        let h = anchorSplitArr[hrefIDX + 1];

        // yahoo.com html encodes characters with hex values.
        h = h.replace(/&#x([a-fA-F0-9]+);/g, (match, group1) => {
          const num = parseInt(group1, 16);
          return String.fromCharCode(num);
        });

        // Tying up loose ends... mostly with relative links or id anchors
        if (h.startsWith("//")) {
          // fix inherited protocol
          h = protocol + h;
        } else if (h.startsWith("#")) {
          // id anchors for current page
          h = target + h;
        } else if (h.startsWith("/")) {
          // fix root-relative links
          h = origin + h;
        } else if (!h.includes(":")) {
          // fix relative links
          h = basePath + "/" + h;
        }
        return h;
      });
  }
  console.log(found.join("\r\n"));
  console.log(found.length);
})();
