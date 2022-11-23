oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g dnd-parser
$ dnd-parser COMMAND
running command...
$ dnd-parser (--version)
dnd-parser/0.0.0 darwin-arm64 node-v16.18.1
$ dnd-parser --help [COMMAND]
USAGE
  $ dnd-parser COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`dnd-parser hello PERSON`](#dnd-parser-hello-person)
* [`dnd-parser hello world`](#dnd-parser-hello-world)
* [`dnd-parser help [COMMAND]`](#dnd-parser-help-command)
* [`dnd-parser plugins`](#dnd-parser-plugins)
* [`dnd-parser plugins:install PLUGIN...`](#dnd-parser-pluginsinstall-plugin)
* [`dnd-parser plugins:inspect PLUGIN...`](#dnd-parser-pluginsinspect-plugin)
* [`dnd-parser plugins:install PLUGIN...`](#dnd-parser-pluginsinstall-plugin-1)
* [`dnd-parser plugins:link PLUGIN`](#dnd-parser-pluginslink-plugin)
* [`dnd-parser plugins:uninstall PLUGIN...`](#dnd-parser-pluginsuninstall-plugin)
* [`dnd-parser plugins:uninstall PLUGIN...`](#dnd-parser-pluginsuninstall-plugin-1)
* [`dnd-parser plugins:uninstall PLUGIN...`](#dnd-parser-pluginsuninstall-plugin-2)
* [`dnd-parser plugins update`](#dnd-parser-plugins-update)

## `dnd-parser hello PERSON`

Say hello

```
USAGE
  $ dnd-parser hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/WilliamChelman/dnd-parser/blob/v0.0.0/dist/commands/hello/index.ts)_

## `dnd-parser hello world`

Say hello world

```
USAGE
  $ dnd-parser hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ dnd-parser hello world
  hello world! (./src/commands/hello/world.ts)
```

## `dnd-parser help [COMMAND]`

Display help for dnd-parser.

```
USAGE
  $ dnd-parser help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for dnd-parser.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `dnd-parser plugins`

List installed plugins.

```
USAGE
  $ dnd-parser plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ dnd-parser plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/index.ts)_

## `dnd-parser plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ dnd-parser plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ dnd-parser plugins add

EXAMPLES
  $ dnd-parser plugins:install myplugin 

  $ dnd-parser plugins:install https://github.com/someuser/someplugin

  $ dnd-parser plugins:install someuser/someplugin
```

## `dnd-parser plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ dnd-parser plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ dnd-parser plugins:inspect myplugin
```

## `dnd-parser plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ dnd-parser plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ dnd-parser plugins add

EXAMPLES
  $ dnd-parser plugins:install myplugin 

  $ dnd-parser plugins:install https://github.com/someuser/someplugin

  $ dnd-parser plugins:install someuser/someplugin
```

## `dnd-parser plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ dnd-parser plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ dnd-parser plugins:link myplugin
```

## `dnd-parser plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dnd-parser plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dnd-parser plugins unlink
  $ dnd-parser plugins remove
```

## `dnd-parser plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dnd-parser plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dnd-parser plugins unlink
  $ dnd-parser plugins remove
```

## `dnd-parser plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dnd-parser plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dnd-parser plugins unlink
  $ dnd-parser plugins remove
```

## `dnd-parser plugins update`

Update installed plugins.

```
USAGE
  $ dnd-parser plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
