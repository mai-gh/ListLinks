#!/usr/bin/env node

const { parseArgs } = require("node:util");
const { readFile, writeFile } = require("node:fs/promises");

const options = {
  "save-file": {
    type: "string",
    short: "s",
    info: 'Specify where you want to save the file. Ex: --save-file "/path/to/file.html".',
  },
  "from-file": {
    type: "string",
    short: "f",
    info: 'Specify which file you want to open. Ex: --from-file "/path/to/file.html".',
  },
  jsdom: {
    type: "boolean",
    short: "m",
    info: "Use the jsdom library to find the links instead of the internal regex based algorithm",
  },
  help: {
    type: "boolean",
    short: "h",
    info: "Print this help message.",
  },
  debug: {
    type: "boolean",
    short: "d",
    info: "Print extra debug info (for vanilla mode).",
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
    "[ --save-path FILE | --from-file FILE ] [ --jsdom ] [ --debug ] [ --help ] URL",
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

const debugPrint = (info) => {
  if (args.values.debug) console.log(info);
};

if (args.values.help) printHelp();
if (!args.positionals[0]) throw new Error("Must provide a URL");
const target = args.positionals[0];
if (!isValidHttpUrl(target)) throw new Error(`Invalid HTTP(S) URL: ${target}`);

const targetURL = new URL(target);
const protocol = targetURL.protocol;
const origin = targetURL.origin;
const basePath =
  !target.endsWith("/") && (target.match(/\//g) || []).length == 2
    ? target
    : target.substring(0, target.lastIndexOf("/"));

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

  if (args.values.jsdom) {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(html, { url: target });
    const anchors = [].slice.call(dom.window.document.getElementsByTagName("a"));
    found = anchors.filter(el=>el.href.length > 0).map((el) => el.href);
  } else {
    const script_tag_reg = /< *script([\s\S]*?)<\/script>/g;
    const style_tag_reg = /< *style([\s\S]*?)<\/style>/g;
    const a_tag_reg = /< *a *([\s\S]*?)>/g;
    const html_cmt_reg = /(\<!--([\s\S]*?)\-->)/g;
    html = html.replace(script_tag_reg, "");
    html = html.replace(style_tag_reg, "");
    html = html.replace(html_cmt_reg, "");
    found = html
      .match(a_tag_reg)
      .filter((a) => a.includes("href=") && !a.includes(`href=''`) && !a.includes('href=""'))
      .map((a) => {

        // fix html encoded quotes since we need them.
        a = a.replace(/&quot;/g, `"`);
        a = a.replace(/&apos;/g, `'`);
        a = a.replace(/&amp;/g, `&`);

        // split each <a> up by single / double quotes or whitespace
        const anchorSplitArr = a.split(/['"\s>]/);
        debugPrint(anchorSplitArr);
        // find the index for the attribute declaration `href`
        const hrefIDX = anchorSplitArr.findIndex((s) => s.endsWith("href=") || s.startsWith("href="));
        debugPrint(`idx: ${hrefIDX}`);
        // the url is the next item, unless they forgot to use quotes...
        let h =
          anchorSplitArr[hrefIDX].startsWith("href=") && anchorSplitArr[hrefIDX] !== "href="
            ? anchorSplitArr[hrefIDX].replace(/^(href=)/, "")
            : anchorSplitArr[hrefIDX + 1];
        debugPrint(`initial h: ${h}`);
        debugPrint(`origin: ${origin}`)

        //h.replace(/\>$/, "");

        // yahoo.com html encodes characters with hex values.
        h = h.replace(/&#x([a-fA-F0-9]+);/g, (match, group1) => {
          const num = parseInt(group1, 16);
          return String.fromCharCode(num);
        });
        // Tying up loose ends... mostly with relative links or id anchors
        if (h.startsWith("//")) {
          // inherited protocol
          h = protocol + h;
        } else if ((h.startsWith("#")) || (h.startsWith("?"))) {
          // id anchors or query parameters for current page
          //h = target + "/" + h;
          h = target + h;
        } else if (h.startsWith("/")) {
          // root-relative links
          h = origin + h;
        } else if (!h.includes(":")) {
          // relative links
          h = basePath + "/" + h;
        }

        // URL interface is used to normalize what we got left.
        h = new URL(h);
        h = h.href;

        debugPrint(`final h: ${h}`);
        return h;
      });
  }
  if ((!args.values.debug) || (args.values.jsdom)) console.log(found.join("\n"));
})();
