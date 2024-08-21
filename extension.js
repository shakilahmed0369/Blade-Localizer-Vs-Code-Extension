
const vscode = require("vscode");

var scapSections = [];


function replaceCommonSigns(content) {
  content = content.replace(/{{(.*?)}}/g, function (match, p1) {
    // Replace < and > only within the matched content inside {{ }}
    let safeContent = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `{{${safeContent}}}`;
  });

  return content;

}

function undoReplaceCommonSigns(content) {
  content = content.replace(/{{(.*?)}}/g, function (match, p1) {
    // Replace < and > only within the matched content inside {{ }}
    let safeContent = p1.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return `{{${safeContent}}}`;
  });

  return content;
}

function extractScapSections(bladeSource) {
  let placeholderIndex = 0;

  scapSections = [];

  // Regex to capture everything inside <script>...</script>, including the tags
  const scriptRegex = /<(script|style)[\s\S]*?<\/\1>/gi;

  // Replace matched <script> sections with placeholders and store them in an array
  const modifiedBladeSource = bladeSource.replace(scriptRegex, (match) => {
    const placeholder = `<!-- SCRIPT_PLACEHOLDER_${placeholderIndex} -->`;
    scapSections.push(match);
    placeholderIndex++;
    return placeholder;
  });

  return { modifiedBladeSource, scapSections };
}

function restoreScapSections(modifiedBladeSource, scapSections) {
  return scapSections.reduce((source, script, index) => {
    const placeholder = `<!-- SCRIPT_PLACEHOLDER_${index} -->`;
    return source.replace(placeholder, script);
  }, modifiedBladeSource);
}




function wrapTextNodesWithBladeDirective(bladeSource) {
  if (!bladeSource) return '';

  function wrapText(content) {
    return content.replace(/(\s*)([^{}]+?)(\s*)(?={{|$)/g, function (match, leadingSpace, staticText, trailingSpace) {
      // Trim the static text and remove special characters
      staticText = staticText.trim().replace(/[',.]/g, '');
  
      // Only wrap if staticText is not empty
      if (staticText !== '') {
        return `${leadingSpace}{{ __('${staticText}') }}${trailingSpace}`;
      } else {
        return match; // Return the original match without wrapping
      }
    });
  }
  

  // Match Blade directives
  const bladeDirectiveRegex = /@\w+(?:\([^)]*\))?/g;

  // Split the template by Blade directives to process text nodes separately
  const parts = bladeSource.split(bladeDirectiveRegex);

  // Find all Blade directives to maintain the original order
  const directives = [...bladeSource.matchAll(bladeDirectiveRegex)].map(match => match[0]);

  let result = '';

  // Process each part
  parts.forEach((part, index) => {

      // Wrap each text node within the part
      const wrappedPart = part.replace(/(>)([^<]+)(<)/g, (match, p1, p2, p3) => {
        if (p2.trim() !== '') {
          return p1 + wrapText(p2) + p3;
        } else {
          return p1 + p2 + p3;
        }
      });

      result += wrappedPart;

    // Add the corresponding Blade directive back
    if (index < directives.length) {
      result += directives[index];
    }
  });

  return result;
}

function activate(context) {
  console.log('Congratulations, your extension "localizer" is now active!');

  let disposable = vscode.commands.registerCommand(
    "laravel.blade.localizer",
    function () {
      // Get the active text editor
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        // Get the document and its content
        const document = editor.document;
        var content = document.getText();

        content = replaceCommonSigns(content);
        content = extractScapSections(content).modifiedBladeSource;
     

        var replacedContents = wrapTextNodesWithBladeDirective(content);
        
        replacedContents = undoReplaceCommonSigns(replacedContents);
        replacedContents = restoreScapSections(replacedContents, scapSections);
        
        // Replace content
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(
            document.positionAt(0), // Start of the content
            document.positionAt(document.getText().length) // End of the content
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
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
