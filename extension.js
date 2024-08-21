const vscode = require("vscode");

let scapSections = [];

function replaceCommonSigns(content) {
  return content.replace(/{{(.*?)}}/g, (match, p1) => {
    return `{{${p1.replace(/</g, '&lt;').replace(/>/g, '&gt;')}}}`;
  });
}

function undoReplaceCommonSigns(content) {
  return content.replace(/{{(.*?)}}/g, (match, p1) => {
    return `{{${p1.replace(/&lt;/g, '<').replace(/&gt;/g, '>')}}}`;
  });
}

function extractScapSections(bladeSource) {
  scapSections = [];
  let placeholderIndex = 0;

  const scriptStyleRegex = /<(script|style)[\s\S]*?<\/\1>/gi;

  const modifiedBladeSource = bladeSource.replace(scriptStyleRegex, (match) => {
    const placeholder = `<!-- SCRIPT_PLACEHOLDER_${placeholderIndex++} -->`;
    scapSections.push(match);
    return placeholder;
  });

  return { modifiedBladeSource, scapSections };
}

function restoreScapSections(modifiedBladeSource) {
  return scapSections.reduce((source, section, index) => {
    const placeholder = `<!-- SCRIPT_PLACEHOLDER_${index} -->`;
    return source.replace(placeholder, section);
  }, modifiedBladeSource);
}

function wrapText(content) {
  return content.replace(/(\s*)([^{}]+?)(\s*)(?={{|$)/g, (match, leadingSpace, staticText, trailingSpace) => {
    staticText = staticText.trim().replace(/[',.]/g, '');
    return staticText ? `${leadingSpace}{{ __('${staticText}') }}${trailingSpace}` : match;
  });
}

function wrapTextNodesWithBladeDirective(bladeSource) {
  if (!bladeSource) return '';

  const bladeDirectiveRegex = /@\w+(?:\([^)]*\))?/g;

  const parts = bladeSource.split(bladeDirectiveRegex);
  const directives = [...bladeSource.matchAll(bladeDirectiveRegex)].map(match => match[0]);

  return parts.reduce((result, part, index) => {
    const wrappedPart = part.replace(/(>)([^<]+)(<)/g, (match, p1, p2, p3) => {
      return p2.trim() ? p1 + wrapText(p2) + p3 : match;
    });

    return result + wrappedPart + (directives[index] || '');
  }, '');
}

function activate(context) {
  console.log('Congratulations, your extension "localizer" is now active!');

  const disposable = vscode.commands.registerCommand("laravel.blade.localizer", () => {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      let content = editor.document.getText();

      content = replaceCommonSigns(content);
      const { modifiedBladeSource } = extractScapSections(content);
      let replacedContents = wrapTextNodesWithBladeDirective(modifiedBladeSource);
      replacedContents = undoReplaceCommonSigns(replacedContents);
      replacedContents = restoreScapSections(replacedContents);

      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        editor.document.uri,
        new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        ),
        replacedContents
      );

      vscode.workspace.applyEdit(edit).then(() => {
        vscode.window.showInformationMessage("Content Replaced Successfully!");
      });
    } else {
      vscode.window.showErrorMessage("No active text editor found.");
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
