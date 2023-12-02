// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const htmlparser = require("htmlparser2");
var selfClosingTag = [];

var $voidTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

function encodeSpecialCharacters(content) {
  // Replace '->' with '[arw]' before parsing
  const modifiedData = content
    .replace(/->/g, "{arw}")
    .replace(/<!/g, "{lt}")
    .replace(/===/g, "{3eq}")
    .replace(/==/g, "{2eq}")
    .replace(/=/g, "{eq}")
    .replace(/(['"])(.*?)\1/g, function (match, quote, content) {
      // Replace '/' with '{slash}' only within the captured content
      var replacedContent = content.replace(/\//g, "{slash}");
      return quote + replacedContent + quote;
    })
    .replace(/{{(.*?)}}/g, function (match, group) {
      var replacedGroup = group.replace(/\s+/g, "~");
      replacedGroup = replacedGroup.replace(/>/g, "&gt;");
      replacedGroup = replacedGroup.replace(/</g, "&lt;");
      return "{{" + replacedGroup + "}}";
    })
    .replace(/__\((.*?)\)/g, function (match, group) {
      var replacedGroup = group.replace(/\s+/g, "~");
      return "__(" + replacedGroup + ")";
    })
    .replace(/\((.*?)\)/g, function (match, group) {
      var replacedGroup = group.replace(/>/g, "&gt;");
      replacedGroup = replacedGroup.replace(/</g, "&lt;");
      return "(" + replacedGroup + ")";
    })
    .replace(/<(\w+)([^>]*)\/>/g, function (match, name, attributes) {
      return `<${name}${attributes} selfClosingTag />`;
    });

  return modifiedData;
}

function decodeSpecialCharacters(content) {
  const modifiedData = content
    .replace(/\{arw\}/g, "->")
    .replace(/\{lt\}/g, "<!")
    .replace(/\{3eq\}/g, "===")
    .replace(/\{2eq\}/g, "==")
    .replace(/\{eq\}/g, "=")
    .replace(/\{slash\}/g, "/")
    .replace(/{{(.*?)}}/g, function (match, group) {
      var replacedGroup = group.replace(/\~/g, " ");
      replacedGroup = replacedGroup.replace(/&gt;/g, ">");
      replacedGroup = replacedGroup.replace(/&lt;/g, "<");

      return "{{" + replacedGroup + "}}";
    })
    .replace(/__\((.*?)\)/g, function (match, group) {
      var replacedGroup = group.replace(/\~/g, " ");
      return "__(" + replacedGroup + ")";
    })
    .replace(/\((.*?)\)/g, function (match, group) {
      var replacedGroup = group.replace(/&gt;/g, ">");
      replacedGroup = replacedGroup.replace(/&lt;/g, "<");
      return "(" + replacedGroup + ")";
    });

  return modifiedData;
}

function createStartingTag(name, attribs) {
  const sortedAttributes = Object.entries(attribs);

  if (attribs.hasOwnProperty("selfClosingTag")) {
    selfClosingTag.push(name);
  }

  return `<${name} ${sortedAttributes
    .map(([key, value]) => {
      if (value === "") {
        if (key === "selfClosingTag") {
          return;
        }
        return key;
      }
      return `${key}="${value}"`;
    })
    .join(" ")}${selfClosingTag.includes(name) ? "/>" : ">"}`;
}

function createEndingTag(name) {
  if (!$voidTags.includes(name) && !selfClosingTag.includes(name)) {
    // Append closing tag to parsedHtml
    return `</${name}>`;
  }

  return "";
}

function extractTextFromCode(codeContent, ignoreSymbols) {
  var parsedHtml = ""; // Variable to store the parsed HTML

  // Parse HTML
  const parser = new htmlparser.Parser(
    {
      onopentag(name, attribs) {
        parsedHtml += createStartingTag(name, attribs);
      },
      ontext(text) {
        // Append text to parsedHtml
        if (new RegExp(`[${ignoreSymbols}]`).test(text) || /^\s*$/.test(text)) {
          parsedHtml += text; // Add text as is
        } else {
          parsedHtml += `{{ __('${text.trim()}') }}`; // Wrap text with {{ __('text') }}
        }
      },
      onclosetag(name) {
        // Append closing tag to parsedHtml
        parsedHtml += createEndingTag(name);
      },
    },
    {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
    }
  );

  parser.write(encodeSpecialCharacters(codeContent));
  parser.end();

  return decodeSpecialCharacters(parsedHtml);
  // return parsedHtml;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Congratulations, your extension "localizer" is now active!');

  let disposable = vscode.commands.registerCommand(
    "wsus.localizer",
    function () {
      // Get the active text editor
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        // Get the document and its content
        const document = editor.document;
        const content = document.getText();

        const configuration = vscode.workspace.getConfiguration(
          "wsus_laravel_localizer"
        );
        const ignoreSymbols = configuration.get("ignore_symbols");
        const fileExtensions = configuration.get("fileExtensions", [
          "blade",
          "html",
        ]);

        const currentFilePath = document.uri.fsPath;
        const [, currentFileExtension] = currentFilePath.split(".");

        // Validate file extesion
        if (!fileExtensions.includes(currentFileExtension)) {
          vscode.window.showInformationMessage(
            `Localizer is not configured for ${currentFileExtension} files.`
          );
          return;
        }

        const replacedContents = extractTextFromCode(content, ignoreSymbols);

        // Replace content
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(
            document.positionAt(0), // Start of the content
            document.positionAt(content.length) // End of the content
          ),
          replacedContents
        );

        vscode.workspace.applyEdit(edit).then(() => {
          vscode.window.showInformationMessage(
            "Content Replaced Successfully!"
          );
        });
      } else {
        vscode.window.showErrorMessage("No active text editor found.");
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
