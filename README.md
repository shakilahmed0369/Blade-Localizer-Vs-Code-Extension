# Laravel Blade Localization Wrapper Extension

This extension will help you to auto select all your blade static strings and wrap those into localization syntax.

## Screenshot
![Uploading demo.gif…]()


## Features

* Wrap static strings with Laravel localization syntax on click.
* Auto detect static strings from file.
* Auto ignore strings that have special characters.
* Blazing Fast.

## Installation

1. Open Visual Studio Code.
2. Click the Extensions icon (the four squares icon) in the Activity Bar.
3. Search for "Wsus Laravel Localizer".
4. Click the Install button next to the extension.

## Usage

1. Open a Laravel Blade file in Visual Studio Code.
4. Press `Ctrl`+`Shift`+`P` to open the Command Palette.
5. Type "Wsus: Laravel Localizer" and select the command and execute.

## Example

```blade
<h1>Hello world!</h1>

<h1>{{__('Hello world!')}}</h1>
```

## Known Issues

Some time some string can be skipped from auto detection depending on your
code structure. 
As this is a beta release of this extension so there could be some bug. Make sure you always give a basic check your code after running the extension.

## Feedback
If you have any feedback or suggestions, please feel free to create an issue on the repository.
