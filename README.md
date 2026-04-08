# @webhandle/site-editor-bridge

Sets up resources for web clients that want to edit site objects like pages, views, files, and menus.

## Install

```sh
npm i @webhandle/site-editor-bridge
```

## Server Usage

```js
import siteEditorBridgeSetup from "@webhandle/site-editor-bridge/initialize-webhandle-component.mjs"
let siteEditorBridgeSetupManager = await siteEditorBridgeSetup(webhandle)
```

Options for these are:

```json
{
	"@webhandle/site-editor-bridge": {
		"resourceTypes": {
			"pages": {
				"serverEndpointUrl": "/@webhandle/site-editor-bridge/services/site-pages"
				, "relativeDirectory": "pages"

			}
			, "files": {
				"serverEndpointUrl": "/@webhandle/site-editor-bridge/services/public-files"
				, "relativeDirectory": "public"

			}
			, "views": {
				"serverEndpointUrl": "/@webhandle/site-editor-bridge/services/site-views"
				, "relativeDirectory": "views"


			}
			, "menus": {
				"serverEndpointUrl": "/@webhandle/site-editor-bridge/services/site-menus"
				, "relativeDirectory": "menus"

			}
		}
		, "serviceTypes": {
			"pages": {
				"serverEndpointUrl": "/@webhandle/site-editor-bridge/services/pages"
				, "editableContentPostProcessors": [
					replaceDoubleUnderscores
					, replaceTemplateContent

				]
				, "pagePropertiesPrerun": [

				]
			}
		}
		, "authorization": createRequireGroupMembership("administrators")
		, "publicFilesPrefix": "/@webhandle/site-editor-bridge/files"
		, "provideResources": true
	}
}
```

Of course the authorization can not be set in this way in a config file. To change the authorization

```js
siteEditorBridgeSetupManager.config.authorization = (req, res, next) => {
	if(/* user valid */) {
		next()
	}	
	else {
		next(new Error('some reason'))
	}
}
```


## Client Side Usage

Importing `siteEditorBridge` will set up file sinks and services on the client side, ready to use.
These objects will NOT be available if the user is not authorized via the authorization function.

```js
import {siteEditorBridge} from "@webhandle/site-editor-bridge"

let info = await siteEditorBridge.resourceTypes.pages.getFullFileInfo('')
info = await siteEditorBridge.resourceTypes.views.getFullFileInfo('')

let pagesService = siteEditorBridge.services.pages
```

You can also get information about the page rendered. Using the import function is safer, because in many cases,
the html document won't have been created from a "page" and therefore this info won't exist.

```js
try {
	let mod = await import("@webhandle/site-editor-bridge/page-render-spec")
	let spec = mod.default
}
catch(e) { }
```

The result is like:
```json
{
	"template": "index.tri",
	"alternatives": {},
	"metadata": "index.json",
	"metadataExists": false,
	"templatePath": "index",
	"requestedPath": "/"
}
```
