import createInitializeWebhandleComponent from "@webhandle/initialize-webhandle-component/create-initialize-webhandle-component.mjs"
import ComponentManager from "@webhandle/initialize-webhandle-component/component-manager.mjs"
import path from "node:path"
import FileSinkServer from 'file-sink-server'
import FileSink from 'file-sink'
import fileSinkRemoteHttpSetup from "file-sink-remote-http/initialize-webhandle-component.mjs"
import createRequireGroupMembership from "@webhandle/users-data/middleware/create-require-group-membership.mjs"
import ServiceServer from "@webhandle/proxied-object-http-client"
import replaceDoubleUnderscores from "./lib/replace-double-underscores.mjs"
import replaceTemplateContent from "./lib/replace-template-content.mjs"
import PagesService from "./lib/pages-service.mjs"
import setupProxyObjects from "@webhandle/proxied-object-http-client/initialize-webhandle-component.mjs"

let initializeWebhandleComponent = createInitializeWebhandleComponent()

initializeWebhandleComponent.componentName = '@webhandle/site-editor-bridge'
initializeWebhandleComponent.componentDir = import.meta.dirname
initializeWebhandleComponent.defaultConfig = {
	resourceTypes: {
		pages: {
			serverEndpointUrl: "/@webhandle/site-editor-bridge/services/site-pages"
			, relativeDirectory: "pages"

		}
		, files: {
			serverEndpointUrl: "/@webhandle/site-editor-bridge/services/public-files"
			, relativeDirectory: "public"

		}
		, views: {
			serverEndpointUrl: "/@webhandle/site-editor-bridge/services/site-views"
			, relativeDirectory: "views"


		}
		, menus: {
			serverEndpointUrl: "/@webhandle/site-editor-bridge/services/site-menus"
			, relativeDirectory: "menus"

		}
	}
	, serviceTypes: {
		pages: {
			serverEndpointUrl: "/@webhandle/site-editor-bridge/services/pages"
			, editableContentPostProcessors: [
				replaceDoubleUnderscores
				, replaceTemplateContent

			]
			, pagePropertiesPrerun: [

			]
		}

	}
	, authorization: createRequireGroupMembership("administrators")
	, publicFilesPrefix: "/@webhandle/site-editor-bridge/files"
	, provideResources: true
}

initializeWebhandleComponent.setup = async function (webhandle, config) {
	let manager = new ComponentManager()
	manager.config = config

	let managerProxyObjects = await setupProxyObjects(webhandle)
	// Make sure the remote file server code gets on the page
	let fileSinkRemoteHttpManager = await fileSinkRemoteHttpSetup(webhandle)

	// Set up a router for each of the resource types
	for (let resourceType of Object.values(config.resourceTypes)) {
		let filePath = path.join(webhandle.projectRoot, resourceType.relativeDirectory)

		let router = webhandle.createRouter()
		router.use((req, res, next) => {
			return config.authorization(req, res, next)
		})
		
		let sink = new FileSink(filePath)
		manager.sinks[resourceType.relativeDirectory] = sink
		let sinkServer = new FileSinkServer(sink)
		sinkServer.addToRouter(router)
		webhandle.routers.primary.use(resourceType.serverEndpointUrl, router)
	}

	let pagesServiceRouter = webhandle.createRouter()
	pagesServiceRouter.use((req, res, next) => {
		return config.authorization(req, res, next)
	})
	let pagesService = new PagesService({
		pagesSink: manager.sinks.pages
		, editableContentPostProcessors: config.serviceTypes.pages.editableContentPostProcessors
	})
	manager.services.pages = pagesService
	let pagesServiceServer = new ServiceServer(pagesService, {
	})
	pagesServiceServer.addToRouter(pagesServiceRouter)
	webhandle.routers.primary.use(config.serviceTypes.pages.serverEndpointUrl, pagesServiceRouter)


	// Allow access to the bridge code
	let filePath = path.join(initializeWebhandleComponent.componentDir, "public")

	manager.staticPaths.push(
		webhandle.addStaticDir(
			filePath,
			{
				urlPrefix: config.publicFilesPrefix
				, fixedSetOfFiles: true
			}
		)
	)


	// Setup bridge config and bride code
	manager.addExternalResources = (externalResourceManager) => {
		managerProxyObjects.addExternalResources(externalResourceManager)
		fileSinkRemoteHttpManager.addExternalResources(externalResourceManager)

		let resource = {
			mimeType: 'application/javascript'
			, name: '@webhandle/site-editor-bridge/configuration'
			, resourceType: 'module'
			, cachable: webhandle.development ? false : true
			, data: {
				resourceTypes: config.resourceTypes
				, serviceTypes: {
					pages: {
						serverEndpointUrl: config.serviceTypes.pages.serverEndpointUrl
					}
				}
			}
		}
		externalResourceManager.provideResource(resource)

		resource = {
			mimeType: 'application/javascript'
			, url: config.publicFilesPrefix + '/js/site-editor-bridge.mjs'
			, name: '@webhandle/site-editor-bridge'
			, resourceType: 'module'
			, cachable: webhandle.development ? false : true
		}
		externalResourceManager.provideResource(resource)
	}

	// Add the bridge objects if the user will have access to them
	webhandle.routers.preDynamic.use((req, res, next) => {
		if (config.provideResources) {
			config.authorization(req, res, (err) => {
				if (!err) {
					// We have a valid user, so we'll add the config to the page.
					manager.addExternalResources(res.locals.externalResourceManager)
				}
				next()
			})
		}
		else {
			next()
		}
	})

	// Add the page server render spec
	if (webhandle.pageServer) {
		webhandle.pageServer.preRun.push((req, res, next) => {
			if (config.provideResources) {
				if (req.renderSpec) {
					return config.authorization(req, res, (err) => {
						if (!err) {
							// We have a valid user, so we'll add the config to the page.
							let resource = {
								mimeType: 'application/javascript'
								, name: '@webhandle/site-editor-bridge/page-render-spec'
								, resourceType: 'module'
								, cachable: webhandle.development ? false : true
								, data: req.renderSpec
							}
							res.locals.externalResourceManager.provideResource(resource)
						}
						next()
					})
				}
			}

			next()
		})
	}

	return manager
}

export default initializeWebhandleComponent
