import pageExtensions from "./page-extensions.mjs"

export default class PagesService {
	pagesSink

	constructor(options) {
		Object.assign(this, options)
	}

	_makePathParts(filePath) {
		let result = {
			filePath: filePath
		}

		let path
		let lastDot = filePath.lastIndexOf('.')
		if (lastDot > -1) {
			path = filePath.substring(0, lastDot)
		}
		else {
			path = filePath
		}

		result.path = path

		let parts = path.split('/').map(part => part.trim()).filter(part => !!part)
		result.label = result.name = parts.pop()
		if (parts.length > 0) {
			result.parentPath = parts.join('/')
		}
		else {
			result.parentPath = ''
		}

		return result
	}

	async createPageTreeOptions() {
		let nodesById = {}
		let nodesByPath = {}
		let counter = 0

		function add(node) {
			let existingNode = nodesByPath[node.path]
			if (!existingNode) {
				existingNode = node
				if (!node.id) {
					node.id = counter++
				}
				nodesById[node.id] = node
				nodesByPath[node.path] = node
				let parent = nodesByPath[node.parentPath]
				if (parent) {
					node.parentId = parent.id
				}
			}
			
			if(node.filePath) {
				if(node.filePath.endsWith('json')) {
					existingNode.metaFilePath = node.filePath
				}
				else {
					existingNode.contentFilePath = node.filePath
				}
			}
			delete node.filePath

			return existingNode
		}

		let pages = {
			label: 'pages'
			, path: ''
			, type: 'container'
		}
		add(pages)

		let directories = await this.pagesSink.findPaths({ directory: true, file: false })
		for (let directory of directories) {
			let dirNode = this._makePathParts(directory)
			dirNode.type = 'container'
			add(dirNode)
		}
		let files = await this.pagesSink.findPaths({ directory: false, file: true, namePattern: /.*\.(tri|html|json)/ })
		for (let file of files) {
			let fileNode = this._makePathParts(file)
			fileNode.type = 'leaf'
			add(fileNode)
		}

		return Object.values(nodesByPath)
	}

	async mv(startingPath, destinationPath) {
		if (startingPath != destinationPath) {
			let meta
				, content
				, finalExt;

			try {
				meta = await this.pagesSink.read(startingPath + '.json')
			}
			catch (e) { }

			for (let ext of pageExtensions) {
				try {
					content = await this.pagesSink.read(startingPath + '.' + ext)
					finalExt = ext
					break
				}
				catch (e) { }
			}

			if (meta) {
				await this.pagesSink.write(destinationPath + '.json', meta)
			}
			if (content) {
				await this.pagesSink.write(destinationPath + '.' + finalExt, content)
			}

			if (meta) {
				await this.pagesSink.rm(startingPath + '.json')
			}
			if (content) {
				await this.pagesSink.rm(startingPath + '.' + finalExt)
			}
		}
	}

	async cp(startingPath, destinationPath) {
		if (startingPath != destinationPath) {
			let meta
				, content
				, finalExt;

			try {
				meta = await this.pagesSink.read(startingPath + '.json')
			}
			catch (e) { }

			for (let ext of pageExtensions) {
				try {
					content = await this.pagesSink.read(startingPath + '.' + ext)
					finalExt = ext
					break
				}
				catch (e) { }
			}

			if (meta) {
				await this.pagesSink.write(destinationPath + '.json', meta)
			}
			if (content) {
				await this.pagesSink.write(destinationPath + '.' + finalExt, content)
			}
		}
	}

	async rm(pagePath) {
		let meta
			, content
			, finalExt;

		try {
			meta = await this.pagesSink.read(pagePath + '.json')
		}
		catch (e) { }

		for (let ext of pageExtensions) {
			try {
				content = await this.pagesSink.read(pagePath + '.' + ext)
				finalExt = ext
				break
			}
			catch (e) { }
		}

		if (meta) {
			await this.pagesSink.rm(pagePath + '.json')
		}
		if (content) {
			await this.pagesSink.rm(pagePath + '.' + finalExt)
		}
	}

}