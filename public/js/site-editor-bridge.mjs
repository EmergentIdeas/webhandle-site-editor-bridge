import config from "@webhandle/site-editor-bridge/configuration"
import { FileSinkRemoteHttp } from "file-sink-remote-http"


let siteEditorBridge = {
	resourceTypes: {}
}

for (let resouceType of Object.entries(config.resourceTypes)) {
	let [name, def] = resouceType
	let url = def.serverEndpointUrl

	let sink = new FileSinkRemoteHttp(url)
	siteEditorBridge.resourceTypes[name] = sink
}



export { siteEditorBridge }
