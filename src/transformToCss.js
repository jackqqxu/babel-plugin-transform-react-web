const isUnitlessNumber = {
	animationIterationCount:true,
	boxFlex:true,
	boxFlexGroup:true,
	boxOrdinalGroup:true,
	columnCount:true,
	flex:true,
	flexGrow:true,
	flexPositive:true,
	flexShrink:true,
	flexNegative:true,
	flexOrder:true,
	fontWeight:true,
	lineClamp:true,
	lineHeight:true,
	opacity:true,
	order:true,
	orphans:true,
	tabSize:true,
	widows:true,
	zIndex:true,
	zoom:true,


	fillOpacity:true,
	stopOpacity:true,
	strokeDashoffset:true,
	strokeOpacity:true,
	strokeWidth:true	
}

var shorthandPropertyExpansions={
	background:{
		backgroundAttachment:true,
		backgroundColor:true,
		backgroundImage:true,
		backgroundPositionX:true,
		backgroundPositionY:true,
		backgroundRepeat:true
	},

	backgroundPosition:{
		backgroundPositionX:true,
		backgroundPositionY:true
	},

	border:{
		borderWidth:true,
		borderStyle:true,
		borderColor:true
	},

	borderBottom:{
		borderBottomWidth:true,
		borderBottomStyle:true,
		borderBottomColor:true
	},

	borderLeft:{
		borderLeftWidth:true,
		borderLeftStyle:true,
		borderLeftColor:true
	},

	borderRight:{
		borderRightWidth:true,
		borderRightStyle:true,
		borderRightColor:true
	},

	borderTop:{
		borderTopWidth:true,
		borderTopStyle:true,
		borderTopColor:true
	},

	font:{
		fontStyle:true,
		fontVariant:true,
		fontWeight:true,
		fontSize:true,
		lineHeight:true,
		fontFamily:true
	},

	outline:{
		outlineWidth:true,
		outlineStyle:true,
		outlineColor:true
	}
};

module.exports = function(obj){
	const ident = ' ';
	let css = [];
	for(let key in obj){
		css.push('.' + key + ident + '{');
		css.push(getClassRule(obj[key]));
		css.push('}')	
	}
	return css.join('\n');
}

function getClassRule(classObj){
	const ident = '    ';
	let rule = [], value;
	for(let key in classObj){
		value = classObj[key];
		if(!isUnitlessNumber[key] && !isNaN(value)) {
			value = '' + value + 'px';	
		}
		rule.push(ident + humpToCross(key) + ': ' + value + ';');
	}
	return rule.join('\n');
}

function humpToCross(str){
	return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}