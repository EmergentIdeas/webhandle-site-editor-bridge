import setup from "../initialize-webhandle-component.mjs"

export default async function setupServer(webhandle) {
	webhandle.development = true
	webhandle.routers.preStatic.use((req, res, next) => {
		req.user = {
			name: "administrator"
			, groups: ["administrators"]
		}
		
		next()
	})
	
	await setup(webhandle)
	
}