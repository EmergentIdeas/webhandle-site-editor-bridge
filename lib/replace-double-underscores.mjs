async function replaceDoubleUnderscores(content) {
	return content.split('__').join('__::dus__')
}

export default replaceDoubleUnderscores
