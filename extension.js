
const vscode = require("vscode");


function wrapTextNodesWithBladeDirective(bladeSource) {
  if (!bladeSource) return '';

  // Helper function to wrap text nodes
  function wrapText(text) {
    // Trim the text and replace special characters
    let trim_data = text.trim()
    .replace(/[',.]/g, '');

    return `{{ __('${trim_data}') }}`;
  }

  // Match Blade directives
  const bladeDirectiveRegex = /@\w+(?:\([^)]*\))?/g;

  // Split the template by Blade directives to process text nodes separately
  const parts = bladeSource.split(bladeDirectiveRegex);

  // Find all Blade directives to maintain the original order
  const directives = [...bladeSource.matchAll(bladeDirectiveRegex)].map(match => match[0]);

  // Helper function to check if we are inside <script>, <style>, @push or @endpush
  function isInsideNoWrapSection(part) {
    const scriptStyleRegex = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|@push[\s\S]*?@endpush/g;
    return scriptStyleRegex.test(part);
  }

  let result = '';

  // Process each part
  parts.forEach((part, index) => {
    if (isInsideNoWrapSection(part)) {
      result += part;
    } else {
      // Wrap each text node within the part
      const wrappedPart = part.replace(/(>)([^<]+)(<)/g, (match, p1, p2, p3) => {
        if (p2.trim() !== '' && !p2.includes('{') && !p2.includes('}')) {
          return p1 + wrapText(p2) + p3;
        } else {
          return p1 + p2 + p3;
        }
      });

      result += wrappedPart;
    }

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
        const content = document.getText();

        const replacedContents = wrapTextNodesWithBladeDirective(content);

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
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
