import config from "@webhandle/site-editor-bridge/configuration"
import { FileSinkRemoteHttp } from "file-sink-remote-http"
import proxyService from "@webhandle/proxied-object-http-client"


let siteEditorBridge = {
	resourceTypes: {}
	, services: {}
	, config: config
}

for (let resouceType of Object.entries(config.resourceTypes)) {
	let [name, def] = resouceType
	let url = def.serverEndpointUrl

	let sink = new FileSinkRemoteHttp(url)
	siteEditorBridge.resourceTypes[name] = sink
}

let pagesService = proxyService({
	urlPrefix: config.serviceTypes.pages.serverEndpointUrl + '/'
})
siteEditorBridge.services.pages = pagesService

export { siteEditorBridge }
