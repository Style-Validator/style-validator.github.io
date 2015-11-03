javascript:"use strict";var STYLEV=STYLEV||{};STYLEV.isChrome=navigator.userAgent.toLowerCase().indexOf("chrome")>-1&&navigator.userAgent.toLowerCase().indexOf("opr")<0,STYLEV.isChromeExtension=function(){try{return chrome.runtime.onMessage.addListener(function(){}),!0}catch(e){return!1}}(),STYLEV.isBookmarklet=STYLEV.isChrome?!STYLEV.isChromeExtension:!0,STYLEV.isReLoaded=void 0!==STYLEV.VALIDATOR,STYLEV.isLoaded=!STYLEV.isReLoaded,STYLEV.isFirstExecution=!0,STYLEV.isValidated=!1,STYLEV.options={ENABLE_MUTATION_OBSERVER:!0,ENABLE_AUTO_EXECUTION:!1,ENABLE_ANIMATION:!1,TARGET_SELECTOR:!1,TARGET_SELECTOR_TEXT:"",NOT_TARGET_SELECTOR:!1,NOT_TARGET_SELECTOR_TEXT:""},STYLEV.affectedElemsStylevId=STYLEV.affectedElemsStylevId||[],STYLEV.ignoreElemsStylevId=STYLEV.ignoreElemsStylevId||[],STYLEV.sameElemCount=STYLEV.sameElemCount||0,STYLEV.consoleWrapperHeight=STYLEV.consoleWrapperHeight||0,STYLEV.consoleScrollTop=STYLEV.consoleScrollTop||0,STYLEV.selectedLineInConsole=STYLEV.selectedLineInConsole||null,STYLEV.VALIDATOR={execute:function(e){var t=this;t.setParameters(),t.insertLibraryOnBookmarklet(),t.send2GA(),Promise.all([t.getURL(t.settings.RULES_PATH).then(JSON.parse),t.getURL(t.settings.RULES_BY_EMPTY_TAG_PATH).then(JSON.parse),t.getURL(t.settings.TAGS_ALL_PATH).then(JSON.parse),t.getURL(t.settings.EMPTY_TAGS_PATH).then(JSON.parse),t.getURL(t.settings.TAGS_REPLACED_ELEMENT_PATH).then(JSON.parse),t.getURL(t.settings.TAGS_TABLE_CHILDREN_PATH).then(JSON.parse),t.getURL(t.settings.DISPLAY_PROP_CHANGEABLE_PROPERTIES_PATH).then(JSON.parse)]).then(function(o){t.rulesData=o[0],t.emptyElemRulesData=o[1],t.tagsAllData=o[2],t.tagsEmptyData=o[3],t.tagsReplacedElementData=o[4],t.tagsTableChildren=o[5],t.displayChangeableProperties=o[6],t.updateOptions().then(function(){t.validate(e),STYLEV.isFirstExecution=!1})})},insertLibraryOnBookmarklet:function(){var e=this;STYLEV.isBookmarklet&&(e.scriptTag=document.createElement("script"),e.scriptTag.src=e.settings.SPECIFICITY_PATH,e.head.appendChild(e.scriptTag))},send2GA:function(){var e=this,t=e.head.querySelector("#stylev-ga"),o=null!==t;o&&e.head.removeChild(t),e.scriptTagGA=document.createElement("script"),e.scriptTagGA.src=e.settings.GA_PATH,e.scriptTagGA.async=!0,e.scriptTagGA.id="stylev-ga",e.head.appendChild(e.scriptTagGA)},setParameters:function(){var e=this;e.html=document.querySelector("html"),e.head=document.querySelector("head"),e.body=document.querySelector("body"),e.htmlDefaultBorderBottomWidth=""===e.html.style.borderBottomWidth?null:e.html.style.borderBottomWidth,e.RESOURCE_ROOT=STYLEV.chromeExtension.RESOURCE_ROOT||"https://style-validator.github.io/",e.settings={CONSOLE_WRAPPER_ID:"stylev-console-wrapper",CONSOLE_LIST_ID:"stylev-console-list",CONSOLE_HEADING_TEXT:"Style Validator",CONSOLE_HEADER_DEFAULT_HEIGHT:200,STYLESHEET_ID:"stylev-stylesheet",STYLESHEET_PATH:e.RESOURCE_ROOT+"app/style-validator.css",SPECIFICITY_PATH:e.RESOURCE_ROOT+"extension/specificity.js",GA_PATH:e.RESOURCE_ROOT+"./extension/google-analytics.js",CONGRATULATION_MESSAGE_TEXT:"It's Perfect!",SERVER_RESOURCE_ROOT:"https://style-validator.github.io/",RULES_PATH:e.RESOURCE_ROOT+"data/rules.json",RULES_BY_EMPTY_TAG_PATH:e.RESOURCE_ROOT+"data/rules-by-empty-tags.json",TAGS_ALL_PATH:e.RESOURCE_ROOT+"data/tags-all.json",EMPTY_TAGS_PATH:e.RESOURCE_ROOT+"data/tags-empty.json",TAGS_REPLACED_ELEMENT_PATH:e.RESOURCE_ROOT+"data/tags-replaced-element.json",TAGS_TABLE_CHILDREN_PATH:e.RESOURCE_ROOT+"data/tags-table-children.json",DISPLAY_PROP_CHANGEABLE_PROPERTIES_PATH:e.RESOURCE_ROOT+"data/displayChangeableProperties.json",CONNECTED_2_DEVTOOLS_MESSAGE:"Connected to DevTools",DISCONNECTED_2_DEVTOOLS_MESSAGE:"Disconnected to DevTools",CONNECTED_2_DEVTOOLS_CLASS:"stylev-console-mode-devtools",DISCONNECTED_2_DEVTOOLS_CLASS:"stylev-console-mode-no-devtools"}},getURL:function(e){return new Promise(function(t,o){var s=new XMLHttpRequest;s.open("GET",e,!0),s.onload=function(){200===s.status?t(s.responseText):o(new Error(s.statusText))},s.onerror=function(){o(new Error(s.statusText))},s.send()})},validate:function(e){console.info("Validator Started");var t=this;t.initializeBeforeValidation();for(var o=0;o<t.allElemLength;o++){var s={};s.targetElem=t.allElem[o],s.targetElemTagName=s.targetElem.tagName.toLowerCase(),s.targetElemDefault=t.iframeDocument.querySelector(s.targetElemTagName);var a=t.regexAllHTMLTag.test(" "+s.targetElemTagName+" ");if(a&&"style"!==s.targetElemTagName){s.targetElem.dataset.stylevid="stylev-"+o,s.targetElemStyles=getComputedStyle(s.targetElem,""),s.targetParentElem=s.targetElem.parentElement,s.targetParentElem&&(s.targetElemParentStyles=getComputedStyle(s.targetParentElem,""),s.targetElemParentDisplayProp=s.targetElemParentStyles.getPropertyValue("display")),s.targetElemDisplayPropVal=s.targetElemStyles.getPropertyValue("display"),s.targetElemDefaultDisplayProp=t.getStyle(s.targetElemDefault,"display");for(var r=t.regexEmptyElem.test(" "+s.targetElemTagName+" "),n=(t.regexTableChildElem.test(" "+s.targetElemTagName+" "),"inline"===s.targetElemDisplayPropVal,"inline-block"===s.targetElemDisplayPropVal,t.regexReplacedElem.test(" "+s.targetElemTagName+" ")),l=0,i=t.rulesData.length;i>l;l++){var d=!0,c=t.rulesData[l],E=c["base-styles"],m=c["error-styles"],g=c["warning-styles"],p=c["parent-error-styles"],h=c["parent-warning-styles"],y=c.replaced;c["pseudo-before-error-styles"],c["pseudo-before-warning-styles"],c["pseudo-after-error-styles"],c["pseudo-after-warning-styles"],c["reference-url"];s.isDisplayPropChanged=!1;var v="Replaced elements"===y&&n||"Non-replaced elements"===y&&!n||void 0===y;if(v){for(var u in E)if(E.hasOwnProperty(u)){var T=E[u],S=getComputedStyle(s.targetElem,"").getPropertyValue(u),f=T===S;if(!f){d=!1;break}}if(d){for(var L in m)m.hasOwnProperty(L)&&t.detectErrorAndWarn("error",L,m,s,!1,!1);for(var C in g)g.hasOwnProperty(C)&&t.detectErrorAndWarn("warning",C,g,s,!1,!1);if("html"!==s.targetElemTagName){for(var _ in h)h.hasOwnProperty(_)&&t.detectErrorAndWarn("warning",_,h,s,!1,!0);for(var O in p)p.hasOwnProperty(O)&&t.detectErrorAndWarn("error",O,p,s,!1,!0)}if("block"!==s.targetElemDefaultDisplayProp&&"list-item"!==s.targetElemDefaultDisplayProp&&"table"!==s.targetElemDefaultDisplayProp&&"none"!==s.targetElemDefaultDisplayProp)for(var A in t.displayChangeableProperties)t.displayChangeableProperties.hasOwnProperty(A)&&(s.isDisplayPropChanged=!0,t.detectErrorAndWarn("error",A,t.displayChangeableProperties,s,!1,!1),s.isDisplayPropChanged=!1);if(r){for(var R in t.emptyElemRulesData["warning-styles"])t.emptyElemRulesData["warning-styles"].hasOwnProperty(R)&&t.detectErrorAndWarn("warning",R,t.emptyElemRulesData["warning-styles"],s,!0,!1);for(var V in t.emptyElemRulesData["error-styles"])t.emptyElemRulesData["error-styles"].hasOwnProperty(V)&&t.detectErrorAndWarn("error",V,t.emptyElemRulesData["error-styles"],s,!0,!1)}}}}}}t.removeIframe4getDefaultStyles(),t.showConsole(),t.toggleSelected(),"function"==typeof e&&e.bind(t)(),t.ovservationManager=t.connectObserve()},updateOptions:function(){return new Promise(function(e,t){STYLEV.isChromeExtension?chrome.storage.sync.get("options",function(t){void 0!==t.options&&(STYLEV.options={ENABLE_MUTATION_OBSERVER:t.options.enabledMutationObserver,ENABLE_AUTO_EXECUTION:t.options.enableAutoExecution,ENABLE_ANIMATION:t.options.enableAnimation,TARGET_SELECTOR:t.options.targetSelector,TARGET_SELECTOR_TEXT:t.options.targetSelectorText?t.options.targetSelectorText.split(","):"",NOT_TARGET_SELECTOR:t.options.notTargetSelector,NOT_TARGET_SELECTOR_TEXT:t.options.notTargetSelectorText?t.options.notTargetSelectorText.split(","):""}),e()}):e()})},initializeBeforeValidation:function(){var e=this;e.regexEmptyElem=new RegExp("^( "+e.tagsEmptyData.join(" | ")+" )"),e.regexReplacedElem=new RegExp("^( "+e.tagsReplacedElementData.join(" | ")+" )"),e.regexTableChildElem=new RegExp("^( "+e.tagsTableChildren.join(" | ")+" )"),STYLEV.isReLoaded&&e.isObserving&&e.ovservationManager.disconnectObserve(),e.removeConsole(),e.removeAllAttrAndEvents(),e.allElem=document.querySelectorAll("*"),e.allElemLength=e.allElem.length,e.messageArray=[],e.errorNum=0,e.warningNum=0,e.insertIframe4getDefaultStyles(),e.setStyleDataBySelectors(document),e.setStyleDataBySelectors(e.iframeDocument),e.regexAllHTMLTag=new RegExp(" "+e.tagsAllData.join(" | ")+" ")},detectErrorAndWarn:function(e,t,o,s,a,r){var n,l=this,i={},d=o[t],c=l.getStyle(s.targetElemDefault,t),E=l.getStyle(s.targetElem,t),m=0===d.indexOf("!"),g=d.match(/^!{0,1}\[(.+)\]$/);d=g?g[1]:d.replace("!","");var p=d.split("|").length>1;if(d=p?d.split("|"):d,n=p?new RegExp(" "+d.join(" | ")+" "):new RegExp(" "+d+" "),s.targetParentElem){var h=s.targetElemParentStyles.getPropertyValue(t);if("line-height"===t){var y=parseFloat(s.targetElemStyles.getPropertyValue("font-size")),v=parseFloat(s.targetElemParentStyles.getPropertyValue("font-size")),u=v/y,T=1.14;E="normal"===E?y*T+"px":E,h="normal"===h?l.controlFloat(v*T,1)+"px":h}}var S=n.test(" "+E+" "),f=parseInt(E,10)>0,L=parseInt(E,10)<0,C=0===parseInt(E,10),_=E===c,O=l.controlFloat(parseFloat(E)*u,1)!==l.controlFloat(parseFloat(h),1),A=E===h,R=n.test(" "+s.targetElemParentDisplayProp+" ");(!m&&S||!m&&"over-0"===d&&f||!m&&"under-0"===d&&L||!m&&"default"===d&&_||!m&&"inherit"===d&&"line-height"===t&&O||!m&&"inherit"===d&&A||!m&&r&&R||m&&"0"===d&&!C||m&&"default"===d&&!_||m&&"inherit"===d&&"line-height"===t&&!O||m&&"inherit"===d&&!A||m&&r&&!R)&&(r?i.text=(a?"Empty Elements ":"")+"<"+s.targetElemTagName+"> display: "+s.targetElemDisplayPropVal+"; display property of parent element is incorrect.("+s.targetElemParentDisplayProp+")":i.text=(a?"Empty Elements ":"")+"<"+s.targetElemTagName+"> display: "+s.targetElemDisplayPropVal+"; "+t+": "+E+";"+(s.isDisplayPropChanged?"(Display Property has changed.)":""),i.idName=s.targetElem.dataset.stylevid,i.type=e,l.messageArray.push(i),"error"===e&&STYLEV.methods.addClass(s.targetElem,"stylev-target-error"),"warning"===e&&STYLEV.methods.addClass(s.targetElem,"stylev-target-warning"))},ovservationManager:null,connectObserve:function(){var e=this,t=["style","class"],o=1e3;if(!STYLEV.options.ENABLE_MUTATION_OBSERVER)return e.isObserving&&e.ovservationManager.disconnectObserve(),!1;e.observer=new MutationObserver(function(t){void 0!==e.observationTimer&&clearTimeout(e.observationTimer),e.observationTimer=setTimeout(function(){for(var o=[],s=!1,a=0,r=t.length;r>a;a++){var n=t[a],l=new RegExp(" "+STYLEV.ignoreElemsStylevId.join(" | ")+" ");if(l.test(" "+n.target.dataset.stylevid+" "))s=!0;else{if(STYLEV.affectedElemsStylevId.length&&(n.target.dataset.stylevid===STYLEV.affectedElemsStylevId[STYLEV.affectedElemsStylevId.length-1]?STYLEV.sameElemCount++:STYLEV.sameElemCount=0),STYLEV.sameElemCount<5?STYLEV.affectedElemsStylevId.push(n.target.dataset.stylevid):(STYLEV.affectedElemsStylevId=[],STYLEV.sameElemCount=0,STYLEV.ignoreElemsStylevId.push(n.target.dataset.stylevid)),n.target.tagName){for(var i,d=[],a=0,c=n.target.attributes,E=c.length;E>a;a++)i=c[a],0===a?d.push(" "+i.nodeName+'="'+i.nodeValue+'"'):d.push(i.nodeName+'="'+i.nodeValue+'"');o.push(n.target.dataset.stylevid+": <"+n.target.tagName.toLowerCase()+d.join(" ")+">")}if("attributes"===n.type&&o.push(n.attributeName+" "+n.type+' of above is changed from "'+n.oldValue+'".'),"characterData"===n.type&&o.push(n.characterData+" "+n.type+' of above is changed from "'+n.oldValue+'".'),n.addedNodes.length)for(var a=0,r=n.addedNodes.length;r>a;a++)o.push(n.addedNodes[a].outerHTML+" is added.");if(n.removedNodes.length)for(var a=0,r=n.removedNodes.length;r>a;a++)o.push(n.removedNodes[a].outerHTML+" is removed.");console.info(o.join("\n\n"))}}s||(STYLEV.isChromeExtension?STYLEV.chromeExtension.execute():e.validate())},o)});var s={attributes:!0,attributeFilter:t,childList:!0,subtree:!0,attributeOldValue:!0,characterDataOldValue:!0};return e.observer.observe(document.querySelector("body"),s),e.observer.observe(document.querySelector("head"),s),console.info("Observer Connected"),e.isObserving=!0,{disconnectObserve:function(){e.observer.disconnect(),e.isObserving=!1,console.info("Observer Disconnected")}}},insertStylesheet:function(){var e=this;return STYLEV.isUsingExtension?!1:(e.linkTag=document.createElement("link"),e.linkTag.id=e.settings.STYLESHEET_ID,e.linkTag.rel="stylesheet",e.linkTag.type="text/css",e.linkTag.href=e.settings.STYLESHEET_PATH,e.head.appendChild(e.linkTag),!1)},removeStylesheet:function(){var e=this,t=document.querySelector("#stylev-stylesheet");null!==t&&e.head.removeChild(e.linkTag)},removeConsole:function(){var e=this,t=document.querySelector("html"),o=document.querySelector("#stylev-console-wrapper");if(null!==o){t.removeChild(o);for(var s=o.shadowRoot.querySelectorAll("a"),a=0,r=s.length;r>a;a++){var n=s[a];n.removeEventListener("click")}t.style.setProperty("border-bottom-width",e.htmlDefaultBorderBottomWidth,"")}},insertIframe4getDefaultStyles:function(){var e=this,t=document.querySelector("#stylev-dummy-iframe");if(null===t){e.iframe4test=document.createElement("iframe"),e.iframe4test.id="stylev-dummy-iframe",e.html.appendChild(e.iframe4test),e.iframeWindow=e.iframe4test.contentWindow,e.iframeDocument=e.iframeWindow.document,e.iframeBody=e.iframeDocument.querySelector("body");for(var o=document.createDocumentFragment(),s=0,a=e.tagsAllData.length;a>s;s++)o.appendChild(document.createElement(e.tagsAllData[s]));e.iframeBody.appendChild(o)}},removeIframe4getDefaultStyles:function(){var e=this,t=document.querySelector("#stylev-dummy-iframe");null!==t&&e.html.removeChild(t)},removeAllAttrAndEvents:function(){for(var e=this,t=document.querySelectorAll("*"),o=document.querySelector("html"),s=0,a=t.length;a>s;s++)t[s].removeAttribute("data-stylevid"),t[s].removeAttribute("data-stylevclass"),t[s].removeEventListener("click",STYLEV.chromeExtension.bind2DevToolsInspect.inspectFromElements),t[s].removeEventListener("click",e.actionInBody);void 0!==o&&o.removeEventListener("keyup",e.destroyOnEsc)},showConsole:function(){var e=this;e.docFlag=document.createDocumentFragment(),e.consoleWrapper=document.createElement("div"),e.consoleWrapperShadowRoot=e.consoleWrapper.createShadowRoot(),STYLEV.isChromeExtension?e.consoleWrapperShadowRoot.innerHTML='<style>@import "'+STYLEV.chromeExtension.RESOURCE_ROOT+'app/style-validator-for-console.css";</style>':e.consoleWrapperShadowRoot.innerHTML='<style>@import "'+e.settings.SERVER_RESOURCE_ROOT+'app/style-validator-for-console.css";</style>',e.consoleHeader=document.createElement("header"),e.consoleHeading=document.createElement("h1"),e.consoleMode=document.createElement("p"),e.consoleTotalNum=document.createElement("div"),e.consoleBody=document.createElement("div"),e.consoleList=document.createElement("ul"),e.consoleCloseButton=document.createElement("a"),e.isMouseDownConsoleHeader=!1,e.consoleStartPosY=0,e.consoleCurrentPosY=0,e.consoleDiffPosY=0,e.consoleWrapper.id=e.settings.CONSOLE_WRAPPER_ID,e.consoleCloseButton.href="javascript: void(0);",e.consoleList.id=e.settings.CONSOLE_LIST_ID,e.consoleHeading.textContent=e.settings.CONSOLE_HEADING_TEXT,e.consoleTotalNum.textContent="Total: "+e.messageArray.length+" / Error: "+e.errorNum+" / warning: "+e.warningNum,e.createMessagesInConsole(),e.bindEvents4Console(),e.consoleHeader.appendChild(e.consoleHeading),e.consoleHeader.appendChild(e.consoleTotalNum),e.consoleHeader.appendChild(e.consoleMode),e.consoleHeader.appendChild(e.consoleCloseButton),e.consoleWrapperShadowRoot.appendChild(e.consoleHeader),e.consoleWrapperShadowRoot.appendChild(e.consoleBody),e.consoleList.appendChild(e.docFlag),e.consoleBody.appendChild(e.consoleList),e.html.appendChild(e.consoleWrapper),e.doAfterParsedConsole()},doAfterParsedConsole:function(){var e=this;setTimeout(function(){e.consoleWrapper.style.height=(STYLEV.consoleWrapperHeight||e.settings.CONSOLE_HEADER_DEFAULT_HEIGHT)+"px",e.consoleWrapperDefaultHeight=parseInt(e.consoleWrapper.offsetHeight,10),e.html.style.setProperty("border-bottom-width",e.consoleWrapperDefaultHeight+"px","important"),e.send2ChromeExtension(),e.restorePreviousCondition()},0)},send2ChromeExtension:function(){var e=this;STYLEV.isChromeExtension&&(chrome.runtime.sendMessage({setBadgeText:e.messageArray.length}),chrome.runtime.sendMessage({name:"switchMode"},function(t){void 0!==t.isConnected2Devtools&&(STYLEV.methods.addClass(e.consoleMode,t.isConnected2Devtools?e.settings.CONNECTED_2_DEVTOOLS_CLASS:e.settings.DISCONNECTED_2_DEVTOOLS_CLASS),e.consoleMode.textContent=t.isConnected2Devtools?e.settings.CONNECTED_2_DEVTOOLS_MESSAGE:e.settings.DISCONNECTED_2_DEVTOOLS_MESSAGE)}))},restorePreviousCondition:function(){var e=this;if(setTimeout(function(){e.consoleList.scrollTop=STYLEV.consoleScrollTop},0),e.consoleList.addEventListener("scroll",function(){STYLEV.consoleScrollTop=event.currentTarget.scrollTop}),"function"==typeof STYLEV.chromeExtension.bind2DevToolsInspect.inspectOfConsoleAPI&&STYLEV.chromeExtension.bind2DevToolsInspect.inspectOfConsoleAPI(),STYLEV.selectedLineInConsole)for(var t=e.consoleList.querySelectorAll("li"),o=0,s=t.length;s>o;o++)if(t[o].innerHTML===STYLEV.selectedLineInConsole.innerHTML){STYLEV.methods.addClass(t[o],"stylev-trigger-selected");break}},createMessagesInConsole:function(){var e=this;if(0===e.messageArray.length)e.congratulationsMessage=document.createElement("li"),e.congratulationsMessage.dataset.stylevclass="stylev-console-perfect",e.congratulationsMessage.textContent=e.settings.CONGRATULATION_MESSAGE_TEXT,e.docFlag.appendChild(e.congratulationsMessage);else for(var t=0,o=e.messageArray.length;o>t;t++){var s=document.createElement("li"),a=document.createElement("a"),r=document.createElement("span");a.href="javascript: void(0);",a.addEventListener("click",e.actionInConsole.bind(e,e.messageArray[t]),!1),a.textContent=e.messageArray[t].text,a.dataset.stylevconsoleid=e.messageArray[t].idName,r.textContent=e.messageArray[t].idName,STYLEV.methods.addClass(s,"stylev-trigger-"+e.messageArray[t].type),"error"===e.messageArray[t].type&&e.errorNum++,"warning"===e.messageArray[t].type&&e.warningNum++,a.appendChild(r),s.appendChild(a),e.docFlag.appendChild(s)}},bindEvents4Console:function(){var e=this;e.consoleHeader.addEventListener("mousedown",function(t){t.preventDefault(),e.isMouseDownConsoleHeader=!0,e.consoleStartPosY=t.pageY},!1),e.html.addEventListener("mousemove",function(t){e.isMouseDownConsoleHeader&&(e.consoleCurrentPosY=t.pageY,e.consoleDiffPosY=e.consoleStartPosY-e.consoleCurrentPosY,e.consoleWrapper.style.height=e.consoleWrapperDefaultHeight+e.consoleDiffPosY+"px",this.style.setProperty("border-bottom-width",e.consoleWrapperDefaultHeight+e.consoleDiffPosY+"px","important"))},!1),e.html.addEventListener("mouseup",function(){e.isMouseDownConsoleHeader=!1,e.consoleWrapperDefaultHeight=parseInt(e.consoleWrapper.offsetHeight,10),STYLEV.consoleWrapperHeight=e.consoleWrapperDefaultHeight},!1),e.consoleCloseButton.addEventListener("click",function(){e.destroy()},!1),e.html.addEventListener("keyup",e.destroyOnEsc,!1)},destroyOnEsc:function(){var e=STYLEV.VALIDATOR;27===event.keyCode&&e.destroy()},actionInConsole:function(e){for(var t=this,o=document.querySelector("#stylev-console-wrapper").shadowRoot,s=o.querySelectorAll("li"),a=0,r=s.length;r>a;a++)STYLEV.methods.removeClass(s[a],"stylev-trigger-selected");for(var n=o.querySelectorAll('[data-stylevconsoleid="'+event.currentTarget.dataset.stylevconsoleid+'"]'),a=0,r=n.length;r>a;a++){var l=n[a];STYLEV.methods.addClass(l.parentElement,"stylev-trigger-selected"),0===a&&(STYLEV.selectedLineInConsole=l.parentElement)}for(var i=0,r=t.allElem.length;r>i;i++)STYLEV.methods.removeClass(t.allElem[i],"stylev-target-selected");var d=document.querySelector('[data-stylevid="'+e.idName+'"]');STYLEV.methods.addClass(d,"stylev-target-selected"),STYLEV.methods.smoothScroll.execute(d)},toggleSelected:function(){var e=this;if(0===e.messageArray.length)return!1;e.consoleWrapper=document.querySelector("#stylev-console-wrapper"),e.consoleWrapperShadowRoot=e.consoleWrapper.shadowRoot,e.consoleTriggerWrapper=e.consoleWrapperShadowRoot.querySelector("ul"),e.consoleTriggers=e.consoleWrapperShadowRoot.querySelectorAll("li"),e.targets=document.querySelector("body").querySelectorAll('[data-stylevclass*="stylev-target-error"], [data-stylevclass*="stylev-target-warning"]');for(var t=0,o=e.targets.length;o>t;t++){var s=e.targets[t];s.addEventListener("click",e.actionInBody,!1)}return!1},actionInBody:function(){event.stopPropagation(),event.preventDefault();for(var e=STYLEV.VALIDATOR,t=document.querySelector("#stylev-console-wrapper").shadowRoot,o=0,s=e.consoleTriggers.length;s>o;o++)STYLEV.methods.removeClass(e.consoleTriggers[o],"stylev-trigger-selected");for(var a=t.querySelectorAll('[data-stylevconsoleid="'+event.currentTarget.dataset.stylevid+'"]'),o=0,s=a.length;s>o;o++){var r=a[o];STYLEV.methods.addClass(r.parentElement,"stylev-trigger-selected"),0===o&&(STYLEV.selectedLineInConsole=r.parentElement)}for(var n=0,s=e.allElem.length;s>n;n++)STYLEV.methods.removeClass(e.allElem[n],"stylev-target-selected");var l=document.querySelector('[data-stylevid="'+event.currentTarget.dataset.stylevid+'"]');STYLEV.methods.addClass(l,"stylev-target-selected");var i=a[0].offsetTop;e.consoleTriggerWrapper.scrollTop=i},controlFloat:function(e,t){return Math.round(parseFloat(e)*Math.pow(10,t))/Math.pow(10,t)},destroy:function(){var e=this;e.removeAllAttrAndEvents(),e.removeConsole(),e.isObserving&&e.ovservationManager.disconnectObserve(),e.removeStylesheet(),STYLEV.isChromeExtension&&setTimeout(function(){chrome.runtime.sendMessage({name:"validatedStatus2False"})},0)},setStyleDataBySelectors:function(e){for(var t=this,o=e.styleSheets,s=0,a=o.length;a>s;s++){var r=o[s],n=r.cssRules;if(null!==n)for(var l=0,i=n.length;i>l;l++){var d=n[l];if(!d.media&&void 0!==d.style)for(var c=d.selectorText,E=d.style,m=E.width?E.width:"auto",g=E.height?E.height:"auto",p=E.getPropertyPriority("width"),h=E.getPropertyPriority("height"),y=SPECIFICITY.calculate(c),v=0,u=y.length;u>v;v++)for(var T=y[v],S=T.selector,f=parseInt(T.specificity.replace(/,/g,""),10),L=e.querySelectorAll(S),C=0,_=L.length;_>C;C++){var O=L[C],A=O.style,R=A.width?A.width:"auto",V=A.height?A.height:"auto",D=R?1e3:f,w=V?1e3:f,P=A.getPropertyPriority("width"),Y=A.getPropertyPriority("height");void 0===O.dataset_stylevwidthspecificity&&(O.dataset_stylevwidthspecificity=D),void 0===O.dataset_stylevheightspecificity&&(O.dataset_stylevheightspecificity=w),void 0===O.dataset_stylevwidthimportant&&(O.dataset_stylevwidthimportant=P),void 0===O.dataset_stylevheightimportant&&(O.dataset_stylevheightimportant=Y),m&&!R&&D>=parseInt(O.dataset_stylevwidthspecificity,10)&&p.length>=O.dataset_stylevwidthimportant.length&&(O.dataset_stylevwidth=m,O.dataset_stylevwidthspecificity=D,O.dataset_stylevwidthimportant=p),m&&p&&!P&&D>=parseInt(O.dataset_stylevwidthspecificity,10)&&p.length>=O.dataset_stylevwidthimportant.length&&(O.dataset_stylevwidth=m,O.dataset_stylevwidthspecificity=D,O.dataset_stylevwidthimportant=p),m&&!p&&R&&D>=parseInt(O.dataset_stylevwidthspecificity,10)&&P.length>=O.dataset_stylevwidthimportant.length&&(O.dataset_stylevwidth=R,O.dataset_stylevwidthspecificity=D,O.dataset_stylevwidthimportant=P),R&&P&&D>=parseInt(O.dataset_stylevwidthspecificity,10)&&P.length>=O.dataset_stylevwidthimportant.length&&(O.dataset_stylevwidth=R,O.dataset_stylevwidthspecificity=D,O.dataset_stylevwidthimportant=P),g&&!V&&w>=parseInt(O.dataset_stylevheightspecificity,10)&&P.length>=O.dataset_stylevheightimportant.length&&(O.dataset_stylevheight=g,O.dataset_stylevheightspecificity=w,O.dataset_stylevheightimportant=Y),g&&h&&V&&w>=parseInt(O.dataset_stylevheightspecificity,10)&&P.length>=O.dataset_stylevheightimportant.length&&(O.dataset_stylevheight=g,O.dataset_stylevheightspecificity=w,O.dataset_stylevheightimportant=Y),g&&!h&&V&&w>=parseInt(O.dataset_stylevheightspecificity,10)&&P.length>=O.dataset_stylevheightimportant.length&&(O.dataset_stylevheight=V,O.dataset_stylevheightspecificity=w,O.dataset_stylevheightimportant=Y),V&&Y&&w>=parseInt(O.dataset_stylevheightspecificity,10)&&P.length>=O.dataset_stylevheightimportant.length&&(O.dataset_stylevheight=V,O.dataset_stylevheightspecificity=w,O.dataset_stylevheightimportant=Y)}}}t.setStyleDataByElements(e)},setStyleDataByElements:function(e){for(var t=e.querySelectorAll("*"),o=0,s=t.length;s>o;o++){var a=t[o];if(void 0===a.dataset_stylevwidth){var r=a.style.getPropertyValue("width");r?a.dataset_stylevwidth=r:a.dataset_stylevwidth="auto"}if(void 0===a.dataset_stylevheight){var n=a.style.getPropertyValue("height");n?a.dataset_stylevheight=n:a.dataset_stylevheight="auto"}}},getStyle:function(e,t){var o,s=getComputedStyle(e,"").getPropertyValue(t);return"width"===t||"height"===t?("width"===t&&(o=e.dataset_stylevwidth),"height"===t&&(o=e.dataset_stylevheight)):o=s,o}},STYLEV.methods={smoothScroll:{getOffsetTop:function(e){return"html"===e.nodeName.toLowerCase()?-window.pageYOffset:e.getBoundingClientRect().top+window.pageYOffset},easeInOutCubic:function(e){return.5>e?4*e*e*e:(e-1)*(2*e-2)*(2*e-2)+1},getTargetPos:function(e,t,o,s){var a=this;return o>s?t:e+(t-e)*a.easeInOutCubic(o/s)},execute:function(e,t){var o=this,t=t||500,s=window.pageYOffset,a=o.getOffsetTop(e)-100,r=Date.now(),n=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||function(e){window.setTimeout(e,15)},l=function(){var e=Date.now()-r;window.scroll(0,o.getTargetPos(s,a,e,t)),t>=e&&n(l)};l()}},addClass:function(e,t){var o=e.dataset.stylevclass,s=!1,a="";return void 0===o?e.dataset.stylevclass="":s=-1!==o.indexOf(t),s||(a=(o?" ":"")+t,e.dataset.stylevclass+=a),!1},removeClass:function(e,t){e.dataset.stylevclass&&(e.dataset.stylevclass=e.dataset.stylevclass.replace(t,""))}},STYLEV.chromeExtension={execute:function(){console.info("Style Validator with Chrome Extension"),setTimeout(function(){chrome.runtime.sendMessage({name:"execute"})},0)},RESOURCE_ROOT:null,bind2DevToolsInspect:{execute:function(e){var t=this;return 0===STYLEV.VALIDATOR.messageArray.length?!1:(t.inspectOfConsoleAPI=e,t.setParameters(),t.bindEvents(),!1)},setParameters:function(){var e=this;e.consoleWrapper=document.querySelector("#stylev-console-wrapper"),e.consoleWrapperShadowRoot=e.consoleWrapper.shadowRoot,e.consoleList=e.consoleWrapperShadowRoot.querySelector("#stylev-console-list"),e.triggers=e.consoleList.querySelectorAll("a[data-stylevconsoleid]"),e.targets=document.querySelector("body").querySelectorAll('[data-stylevclass*="stylev-target-error"], [data-stylevclass*="stylev-target-warning"]')},bindEvents:function(){for(var e=this,t=0,o=e.triggers.length;o>t;t++)e.triggers[t].addEventListener("click",e.inspectFromConsole,!1);for(var s=0,o=e.targets.length;o>s;s++)e.targets[s].addEventListener("click",e.inspectFromElements,!1)},inspectFromConsole:function(){event.preventDefault();var e=STYLEV.chromeExtension.bind2DevToolsInspect,t=event.currentTarget,o=t.querySelector("span").textContent,s=document.querySelector('[data-stylevid="'+o+'"]');try{e.inspectOfConsoleAPI(s)}catch(a){console.error(a)}},inspectFromElements:function(){event.preventDefault(),event.stopPropagation();var e=STYLEV.chromeExtension.bind2DevToolsInspect,t=event.target;try{e.inspectOfConsoleAPI(t)}catch(o){console.error(o)}}}},STYLEV.isChromeExtension&&(STYLEV.VALIDATOR.updateOptions().then(function(){STYLEV.options.ENABLE_AUTO_EXECUTION?STYLEV.chromeExtension.execute():STYLEV.isValidated?(STYLEV.VALIDATOR.destroy(),STYLEV.isValidated=!1):STYLEV.isValidated=!0,STYLEV.isUsingExtension=!0,STYLEV.chromeExtension.RESOURCE_ROOT=chrome.runtime.getURL("")}),chrome.storage.onChanged.addListener(function(e,t){if("sync"===t&&e.options){var o=document.querySelector("html");e.options.newValue.enableAnimation?void 0!==o.dataset.stylevclass?o.dataset.stylevclass+=" stylev-animation":o.dataset.stylevclass="stylev-animation":-1!==o.dataset.stylevclass.indexOf(" stylev-animation")&&(o.dataset.stylevclass-=" stylev-animation")}})),STYLEV.isBookmarklet&&STYLEV.isLoaded?(console.info("Style Validator with Bookmarklet."),STYLEV.VALIDATOR.execute(STYLEV.VALIDATOR.insertStylesheet)):STYLEV.isBookmarklet&&STYLEV.isReLoaded&&(console.info("Style Validator with Bookmarklet (ReExecution)"),STYLEV.VALIDATOR.validate());