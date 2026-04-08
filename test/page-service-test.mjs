import test from "node:test"
import assert from "node:assert"

import FileSink from 'file-sink'
import PagesService from "../lib/pages-service.mjs"
import replaceDoubleUnderscores from "../lib/replace-double-underscores.mjs"
import replaceTemplateContent from "../lib/replace-template-content.mjs"

let pagesSink = new FileSink('pages')
let pagesService = new PagesService({pagesSink
	, editableContentPostProcessors: [
		replaceDoubleUnderscores
		, replaceTemplateContent
	]
})


await test("page service tests", async (t) => {

	await t.test('create nodes', async (t) => {
		let nodes = await pagesService.createPageTreeOptions()
		assert.equal(nodes[3].path, 'sub1/page2', 'paths should match')
		console.log(nodes)
	})

	await t.test('move nodes', async (t) => {
		await pagesService.mv('sub1/page2', 'page2a')
		let info = await pagesSink.getFullFileInfo('page2a.tri')
		assert(!!info, 'Info should contain information.')
		await pagesService.mv('page2a', 'sub1/page2')
		info = await pagesSink.getFullFileInfo('sub1/page2.tri')
		assert(!!info, 'Info should contain information.')
		
		await pagesService.mv('sub1/page3', 'page3a')
		info = await pagesSink.getFullFileInfo('page3a.html')
		assert(!!info, 'Info should contain information.')
		info = await pagesSink.getFullFileInfo('page3a.json')
		assert(!!info, 'Info should contain information.')
		await pagesService.mv('page3a', 'sub1/page3')
		info = await pagesSink.getFullFileInfo('sub1/page3.json')
		assert(!!info, 'Info should contain information.')
		info = await pagesSink.getFullFileInfo('sub1/page3.html')
		assert(!!info, 'Info should contain information.')
	})

	await t.test('cp and remove nodes', async (t) => {
		await pagesService.cp('sub1/page2', 'page2a')
		let info = await pagesSink.getFullFileInfo('page2a.tri')
		assert(!!info, 'Info should contain information.')
		info = await pagesSink.getFullFileInfo('sub1/page2.tri')
		assert(!!info, 'Info should contain information.')

		await pagesService.rm('page2a')
		info = null
		try {
			info = await pagesSink.getFullFileInfo('page2a.tri')
		}
		catch(e) {}
		assert(!info, 'Info should be blank.')
	})
	await t.test('update sections', async (t) => {
		let d = new Date().getTime() + ''
		let content = `<p>hello there, world __ ${d}</p>`
		await pagesService.updateSections('sub1/page2.tri', [
			content
			, 'hi'
		])
		
		let file = (await pagesSink.read('sub1/page2.tri')).toString()
		let index = file.indexOf(d)
		assert(index > -1, 'The time stamp should exist in the file.')
	})
})