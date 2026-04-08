import pageExtensions from "./page-extensions.mjs"
import * as cheerio from 'cheerio';

export default class PagesService {
	pagesSink
	editableContentPostProcessors = []

	constructor(options) {
		Object.assign(this, options)
		if (options.editableContentPostProcessors) {
			this.editableContentPostProcessors = options.editableContentPostProcessors
		}
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

			if (node.filePath) {
				if (node.filePath.endsWith('json')) {
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

	async updateSections(pageContentPath, sections) {
		if (!sections || !Array.isArray(sections) || sections.length === 0) {
			return
		}
		let meta
			, content
			, finalExt;

		// Run through all the sections and apply any processing to them.
		// By default there are at least two processors, one that looks for underscores
		// and one that replaces the contents of template widgets with template code
		for (let index in sections) {
			let section = sections[index]
			for (let processor of this.editableContentPostProcessors) {
				section = await processor(section)
			}
			sections[index] = section
		}


		// replace the content of the existing template
		content = await this.pagesSink.read(pageContentPath)
		let $ = cheerio.load(content, { decodeEntities: false })
		$('.edit-content-inline').each(function (index, element) {
			$(this).html(sections[index])
		})

		// figure out if we should be saving the entire document (rare for normal usage, but happens
		// when we're editing full pages) or we're editing a template which did not start out as a
		// full document
		let lower = content.toString().toLowerCase()
		let val = lower.indexOf('<html') > -1 ? $.html() : $('body').html()
		await this.pagesSink.write(pageContentPath, val)
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
		if (!content && !meta) {
			// probably a directory
			await this.pagesSink.rm(pagePath)
		}
	}

}