/*!
 Style Validator
 "Validation in the Browser". Validate computedStyle with track all events.
 https://style-validator.github.io/
 by Igari Takeharu
 MIT License
 */

'use strict';

//名前空間を生成
var STYLEV = STYLEV || {};

//Chromeブラウザかの判定　※Operaを除く
STYLEV.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1 && navigator.userAgent.toLowerCase().indexOf('opr') < 0;

//Chrome Extensionかの判定
STYLEV.isChromeExtension = (function() {
	try {
		chrome.runtime.onMessage.addListener(function() {} );
		return true;
	} catch(e) {
		return false;
	}
}());

//ブックマークレットかの判定 ChromeでかつChrome Extensionでない場合はブックマークレット
STYLEV.isBookmarklet = STYLEV.isChrome ? !STYLEV.isChromeExtension : true;

//再読込かどうかの判定
STYLEV.isReLoaded = STYLEV.VALIDATOR !== undefined;

//初期読込かどうかの判定
STYLEV.isLoaded = !STYLEV.isReLoaded;

//初期実行かどうかの判定
STYLEV.isFirstExecution = true;

//検証済かどうか
STYLEV.isValidated = false;

//オプション設定
STYLEV.options = {

	ENABLE_MUTATION_OBSERVER: true,
	ENABLE_AUTO_EXECUTION: false,
	ENABLE_ANIMATION: false,
	TARGET_SELECTOR: false,
	TARGET_SELECTOR_TEXT: '',
	NOT_TARGET_SELECTOR: false,
	NOT_TARGET_SELECTOR_TEXT: ''
};

//TODO: 再度テストする↓
//監視用プロパティ 連続で同じ要素が変更される場合は、メモリ節約のため、無視する
STYLEV.affectedElemsStylevId = STYLEV.affectedElemsStylevId || [];
STYLEV.ignoreElemsStylevId = STYLEV.ignoreElemsStylevId || [];
STYLEV.sameElemCount = STYLEV.sameElemCount || 0;

//consoleのscroll位置を記憶
STYLEV.consoleWrapperHeight = STYLEV.consoleWrapperHeight || 0;
STYLEV.consoleScrollTop = STYLEV.consoleScrollTop || 0;
STYLEV.selectedLineInConsole = STYLEV.selectedLineInConsole || null;

//バリデート機能オブジェクト
STYLEV.VALIDATOR = {

	//実行するための関数
	execute: function(callback) {

		var that = STYLEV.VALIDATOR;

		//二回目の実行の場合は、即検証に入る
		if(!STYLEV.isFirstExecution) {

			that.validate(callback);
			return false;
		}

		//インスタンス変数などを設定
		that.setParameters();

		//ライブラリを挿入
		that.insertLibs4Bookmarklet();

		//データを並列で非同期に取得し、全て終わったらそれぞれのインスタンス変数に格納
		//TODO: Promiseチェーンをもっと上手く書けないか検討
		//TODO: 別関数に外出しして、読みやすくする
		Promise

			//同時にJSONをリクエスト
			.all([
				that.getDataFromURL(that.settings.RULES_PATH).then(JSON.parse),
				that.getDataFromURL(that.settings.TAGS_ALL_PATH).then(JSON.parse),
				that.getDataFromURL(that.settings.EMPTY_TAGS_PATH).then(JSON.parse),
				that.getDataFromURL(that.settings.TAGS_REPLACED_ELEMENT_PATH).then(JSON.parse),
				that.getDataFromURL(that.settings.TAGS_TABLE_CHILDREN_PATH).then(JSON.parse)
			])

			//全てのJSONを読み込み終わったら
			.then(function(dataArray) {

				//ルールのデータ取得
				that.rulesData = dataArray[0];

				//HTMLタグのデータ
				that.tagsAllData = dataArray[1];
				that.tagsEmptyData = dataArray[2];
				that.tagsReplacedElementData = dataArray[3];
				that.tagsTableChildren = dataArray[4];

				//HTMLタグを判定する用の正規表現
				that.regexAllHTMLTag = new RegExp(' ' + that.tagsAllData.join(' | ') + ' ');
				that.regexEmptyElem = new RegExp('^( ' + that.tagsEmptyData.join(' | ') + ' )');
				that.regexReplacedElem = new RegExp('^( ' + that.tagsReplacedElementData.join(' | ') + ' )');
				that.regexTableChildElem = new RegExp('^( ' + that.tagsTableChildren.join(' | ') + ' )');

				//オプションを更新してから、検証実行
				that.updateOptions().then(function() {
					
					//DOM監視をセットアップ
					that.moManager = that.setupMutationObserver();

					//検証開始
					that.validate(callback);

					STYLEV.isFirstExecution = false;
				});
			});

		return false;
	},

	//インスタンス変数の定義
	setParameters: function() {

		var that = STYLEV.VALIDATOR;

		//要素の取得
		that.html = document.querySelector('html');
		that.head = document.querySelector('head');
		that.body = document.querySelector('body');

		//html要素のボーダーボトムのスタイルの初期値を記憶
		//このバリデータによる指定がない場合は、消す処理（null）をいれ、指定があった場合は、初期の数値に戻す
		that.htmlDefaultBorderBottomWidth = that.html.style.borderBottomWidth === '' ? null : that.html.style.borderBottomWidth;

		//リソースルートを設定
		that.RESOURCE_ROOT = that.RESOURCE_ROOT || 'https://style-validator.github.io/Style-Validator/extension/';

		//監視フラグの初期化
		that.isObserving = false;

		//更新フラグの初期化
		that.isUpdated = false;

		//静的な設定値 TODO: 他にもsettingsにまとめられる値があるので後で精査
		that.settings = {

			CONSOLE_WRAPPER_ID: 'stylev-console-wrapper',
			CONSOLE_LIST_ID: 'stylev-console-list',
			STYLESHEET_ID: 'stylev-stylesheet',

			CONSOLE_WRAPPER_DEFAULT_HEIGHT: 200,
			CONSOLE_HEADING_TEXT: 'Style Validator',
			CONGRATULATION_MESSAGE_TEXT: 'It\'s Perfect!',

			STYLESHEET_PATH: that.RESOURCE_ROOT + 'style-validator-for-elements.css',
			SPECIFICITY_PATH: that.RESOURCE_ROOT + 'specificity.js',
			GA_PATH: that.RESOURCE_ROOT + 'google-analytics.js',

			RULES_PATH: that.RESOURCE_ROOT + 'data/rules.json',
			TAGS_ALL_PATH: that.RESOURCE_ROOT + 'data/tags-all.json',
			EMPTY_TAGS_PATH: that.RESOURCE_ROOT + 'data/tags-empty.json',
			TAGS_REPLACED_ELEMENT_PATH: that.RESOURCE_ROOT + 'data/tags-replaced-element.json',
			TAGS_TABLE_CHILDREN_PATH: that.RESOURCE_ROOT + 'data/tags-table-children.json',
			ICON_REFRESH_PATH: that.RESOURCE_ROOT + 'iconmonstr-refresh-3-icon.svg',
			ICON_REFRESH_ACTIVE_PATH: that.RESOURCE_ROOT + 'iconmonstr-refresh-3-icon-active.svg',
			ICON_CLOSE_PATH: that.RESOURCE_ROOT + 'iconmonstr-x-mark-icon.svg',
			ICON_MINIMIZE_PATH: that.RESOURCE_ROOT + 'iconmonstr-minus-2-icon.svg',
			ICON_NORMALIZE_PATH: that.RESOURCE_ROOT + 'iconmonstr-plus-2-icon.svg',
			ICON_CONNECTED_PATH: that.RESOURCE_ROOT + 'iconmonstr-link-4-icon.svg',
			ICON_DISCONNECTED_PATH: that.RESOURCE_ROOT + 'iconmonstr-link-5-icon.svg',
			ICON_LOGO_PATH: that.RESOURCE_ROOT + 'style-validator.logo.black.svg',

			CONNECTED_2_DEVTOOLS_MESSAGE: 'Connected to DevTools',
			DISCONNECTED_2_DEVTOOLS_MESSAGE: 'Disconnected to DevTools',
			CONNECTED_2_DEVTOOLS_CLASS: 'stylev-console-mode-devtools-connected',
			DISCONNECTED_2_DEVTOOLS_CLASS: 'stylev-console-mode-devtools-disconnected'
		};

	},

	//Ajaxでデータを取得する関数
	//promiseオブジェクトを返す
	getDataFromURL: function(url) {
		var that = STYLEV.VALIDATOR;

		return new Promise(function (resolve, reject) {
			var req = new XMLHttpRequest();
			req.open('GET', url, true);
			req.onload = function () {
				if (req.status === 200) {
					resolve(req.responseText);
				} else {
					reject(new Error(req.statusText));
				}
			};
			req.onerror = function () {
				reject(new Error(req.statusText));
			};
			req.send();
		});
	},

	insertLibs4Bookmarklet: function() {
		var that = STYLEV.VALIDATOR;

		if(STYLEV.isBookmarklet) {

			var pathesArray = [
				that.settings.SPECIFICITY_PATH
			];
			var docFlag = document.createDocumentFragment();

			for(var i = 0 , pathesArrayLen = pathesArray.length; i < pathesArrayLen; i++) {
				var path = pathesArray[i];
				if(that.head.querySelectorAll('script[src="' + path + '"]').length) {
					continue;
				}
				that.scriptTag = document.createElement('script');
				that.scriptTag.src = path;
				that.scriptTag.classList.add('stylev-ignore');
				docFlag.appendChild(that.scriptTag);
			}

			/* append */
			that.head.appendChild(docFlag);
		}
	},

	insertGA: function() {
		var that = STYLEV.VALIDATOR;

		//既に挿入したGAがいれば取得して、削除
		if(that.scriptTagGA !== undefined) {
//			var currentGA = that.head.querySelector('#stylev-ga');
			that.scriptTagGA.parentElement.removeChild(that.scriptTagGA);
		}

		that.scriptTagGA = document.createElement('script');
		that.scriptTagGA.src = that.settings.GA_PATH;
		that.scriptTagGA.async = "async";
		that.scriptTagGA.id = 'stylev-ga';
		that.scriptTagGA.classList.add('stylev-ignore');

		/* append */
		that.head.appendChild(that.scriptTagGA);
	},

	//オプションを更新する
	//promiseオブジェクトを返す
	updateOptions: function() {
		var that = STYLEV.VALIDATOR;

		return new Promise(function(resolve, reject) {

			//Chrome Extensionの場合は更新する
			if(STYLEV.isChromeExtension) {

				chrome.storage.sync.get('options', function(message) {

					if(message.options !== undefined) {
						//オプション設定
						STYLEV.options = {

							ENABLE_MUTATION_OBSERVER: message.options.enabledMutationObserver,
							ENABLE_AUTO_EXECUTION: message.options.enableAutoExecution,
							ENABLE_ANIMATION: message.options.enableAnimation,
							TARGET_SELECTOR: message.options.targetSelector,
							TARGET_SELECTOR_TEXT: message.options.targetSelectorText ? message.options.targetSelectorText.split(',') : '',
							NOT_TARGET_SELECTOR: message.options.notTargetSelector,
							NOT_TARGET_SELECTOR_TEXT: message.options.notTargetSelectorText ? message.options.notTargetSelectorText.split(',') : ''
						};
					}

					resolve();

				});

			//Chrome Extension以外の場合何もしない
			} else {

				resolve();
			}
		});

	},

	//全要素に対して、バリデートを行う
	validate: function(callback) {

		console.info('Validator is starting...');

		var that = STYLEV.VALIDATOR;

		//DOM情報などを初期化
		that.initializeBeforeValidation();

		//全容要素を検査
		for ( var i = 0; i < that.allElemLength; i++ ) {

			var elemData = {};

			elemData.targetElem = that.allElem[i];
			elemData.targetElemTagName = elemData.targetElem.tagName.toLowerCase();
			elemData.targetElemDefault = that.iframeDocument.querySelector(elemData.targetElemTagName);

			var isRegularHTMLTag = that.regexAllHTMLTag.test(' ' + elemData.targetElemTagName + ' ');

			//通常のHTMLタグでない場合は、処理を止める svg1.1のsvgとstyleタグもdata属性が許可されていない
			if(!isRegularHTMLTag || elemData.targetElemTagName === 'style') {
				console.info('Unsupported Tag')
				continue;
			}

			elemData.targetElemStyles = getComputedStyle(elemData.targetElem, '');
			elemData.targetParentElem = elemData.targetElem.parentElement || null;

			//親要素が合った場合
			if(elemData.targetParentElem) {

				//親要素のスタイル情報
				elemData.targetElemParentStyles = getComputedStyle(elemData.targetParentElem, '');

				//親要素のDisplayのプロパティ値
				elemData.targetElemParentDisplayProp = elemData.targetElemParentStyles.getPropertyValue('display');

			}

			//TODO: Firefoxの場合は、デフォルトスタイルを取得できるので、それを使うようにする

			//対象要素のDisplayプロパティのプロパティ値
			elemData.targetElemDisplayPropVal = elemData.targetElemStyles.getPropertyValue('display');

			//対象要素のDisplayプロパティのデフォルトのプロパティ値 TODO: displayはautoが無いので、普通のgetでもいいかも？
			elemData.targetElemDefaultDisplayProp = that.getStyle(elemData.targetElemDefault, 'display');

			//空要素を判定
			var isEmptyElements = that.regexEmptyElem.test(' ' + elemData.targetElemTagName + ' ');

			//サイズ指定できるインライン要素を判定
			var isReplacedElemTag = that.regexReplacedElem.test(' ' + elemData.targetElemTagName + ' ');

			//HTML以外であれば、親が存在するので親要素のチェック
			var hasParent = elemData.targetElemTagName !== 'html';

			if(isEmptyElements) {
				//TODO: 擬似要素をインスタンス変数に格納し、擬似要素エラー
			}

			//一つ一つの要素に対して、全てのNGルールの分だけ検査
			for(var j = 0, len = that.rulesData.length; j < len; j++) {

				//全てのbaseStyleが指定されているか
				var hasAllBaseStyles = true;

				var rule = that.rulesData[j];

				var baseStyles = rule['base-styles'];
				var ngStyles = rule['ng-styles'];
				var replaced = rule['replaced'];
				var empty = rule['empty'];
				var baseStylesText = '';

				//初期化
				elemData.isDisplayPropChanged = false;

				//置換要素のルールに対応しない要素の場合はフィルターする
				if(replaced === 'Replaced elements') {
					if(!isReplacedElemTag) {
						continue;
					}
				}

				//置換要素のルールに対応しない要素の場合はフィルターする
				if(replaced === 'Non-replaced elements') {
					if(isReplacedElemTag) {
						continue;
					}
				}

				//空要素用のルールだった場合は、空要素でない場合はフィルターする
				if(empty === 'Empty elements') {
					if(!isEmptyElements) {
						continue;
					}
				}

				//全てのベーススタイルの分だけ検査
				for(var baseStyleProp in baseStyles) {
					if ( baseStyles.hasOwnProperty(baseStyleProp) ) {

						var baseStylePropVal = baseStyles[baseStyleProp];

						baseStylesText += baseStyleProp + ': ';
						baseStylesText += baseStylePropVal + ';';

						var targetElemBasePropVal = getComputedStyle(elemData.targetElem, '').getPropertyValue(baseStyleProp);

						var hasBaseStyle = baseStylePropVal === targetElemBasePropVal;

						//ベーススタイルを持っていない場合は、中止してループから抜け出す
						if(!hasBaseStyle) {
							hasAllBaseStyles = false;
							break;
						}
					}
				}


				//全てのベーススタイルに適合した場合 TODO: ORもオプションで指定できるようにするか検討
				if(hasAllBaseStyles) {

					for (var ngStyleType in ngStyles) {
						if ( ngStyles.hasOwnProperty(ngStyleType) ) {

							var ngStyleProps = ngStyles[ngStyleType];

							for (var ngStyleProp in ngStyleProps) {
								if ( ngStyleProps.hasOwnProperty(ngStyleProp) ) {

									var ngStylePropVal = ngStyleProps[ngStyleProp];

									that.detectError(ngStyleType, ngStyleProp, ngStylePropVal, rule, elemData, baseStylesText);
								}
							}
						}
					}

				}
			}


			//TODO: 共通化できるか？
			if(
				!(
					elemData.targetElem.classList.contains('stylev-target-error') ||
					elemData.targetElem.classList.contains('stylev-target-warning')
				)
			) {
				elemData.targetElem.classList.remove('stylev-target-selected');
			}
		}

		//デフォルトスタイル取得用のiframeを削除
		that.removeIframe4getDefaultStyles();

		//コンソールを表示
		that.showConsole();

		//対象要素をクリックした時のイベントハンドラを登録
		that.bind4targetElements();

		//バリデート完了時のcallbackが存在し関数だった場合実行
		if(typeof callback === 'function') {
			callback();
		}

		//GAタグを挿入
		that.insertGA();

		console.info('Validated and Console Displayed');

		//バリデータによるDOM変更が全て完了してから監視開始
		that.moManager.connect();

		STYLEV.isValidated = true;
	},

	//エラーや警告を検知する
	detectError: function(ngStyleType, ngStyleProp, ngStylePropVal, rule, elemData, baseStylesText) {

		var that = STYLEV.VALIDATOR;

		//メッセージ管理するオブジェクト
		var result = {};

		var splitTypeArray = ngStyleType.split('-');

		//親要素をチェックする
		var isParentCheking = elemData.targetParentElem && splitTypeArray[0] === 'parent';

		//擬似セレクター
		var pseudoSelector = splitTypeArray[0] === 'pseudo' ? splitTypeArray[1] : null;

		//対象要素のNGスタイルのデフォルト値
		var targetElemNgStyleDefaultVal = that.getStyle(elemData.targetElemDefault, ngStyleProp, pseudoSelector);

		//対象要素のNGスタイルの現在の値
		var targetElemNgStyleVal = that.getStyle(elemData.targetElem, ngStyleProp, pseudoSelector);

		//NGスタイルのプロパティ値を検索するための正規表現
		var regexNgStyleRulesPropVal;

		//値が配列の場合
		var comment = '';
		var referenceURL = null;
		if(ngStylePropVal instanceof Array) {
			result.comment = ngStylePropVal[1] || null;
			result.referenceURL = ngStylePropVal[2] || null;
			ngStylePropVal = ngStylePropVal[0];
		}

		//否定表現の有無を検査
		var isReverse = ngStylePropVal.indexOf('!') === 0;

		//[]括弧が存在するか検査
		var hasGroupOperator = ngStylePropVal.match(/^!{0,1}\[(.+)\]$/);

		//[]括弧がある場合は、括弧の中身を返し、ない場合は、そのまま
		ngStylePropVal = hasGroupOperator ? hasGroupOperator[1] : ngStylePropVal.replace('!', '');

		//|OR演算子があるかの検査
		var hasOrOperator = ngStylePropVal.split('|').length > 1;

		//OR演算子がある場合は、OR演算子で区切った配列を返却し、そうでない場合はそのまま
		ngStylePropVal = hasOrOperator ? ngStylePropVal.split('|') : ngStylePropVal;

		//NGスタイルのプロパティ値が複数あった場合
		if(hasOrOperator) {

			//両端にスペースをいれて完全単語検索をしてかつ、複数ワードで検索
			regexNgStyleRulesPropVal = new RegExp(' ' + ngStylePropVal.join(' | ') + ' ');

		} else {

			//両端にスペースをいれて完全単語検索をしている
			regexNgStyleRulesPropVal = new RegExp(' ' + ngStylePropVal + ' ');
		}

		//親要素を持つ場合
		if(elemData.targetParentElem) {

			//親要素のNGスタイルの値
			var targetElemParentNgStyleVal = elemData.targetElemParentStyles.getPropertyValue(ngStyleProp);

			//line-heightの相対指定の場合は、親子の継承関係であってもfont-sizeによって相対的に変わるため、font-sizeの関係性を計算に入れる
			//TODO: line-heightの計算にバグあり　今は指定を外している？
			if(ngStyleProp === 'line-height') {
				var targetElemFontSize = parseFloat(elemData.targetElemStyles.getPropertyValue('font-size'));
				var targetElemParentFontSize = parseFloat(elemData.targetElemParentStyles.getPropertyValue('font-size'));
				var fontSizeScaleRate = targetElemParentFontSize / targetElemFontSize;
				var lineHeightNormalScaleRate = 1.14;
				targetElemNgStyleVal = targetElemNgStyleVal === 'normal' ? targetElemFontSize * lineHeightNormalScaleRate + 'px' : targetElemNgStyleVal;
				targetElemParentNgStyleVal = targetElemParentNgStyleVal === 'normal' ? that.controlFloat(targetElemParentFontSize * lineHeightNormalScaleRate, 1) + 'px' : targetElemParentNgStyleVal;
			}
		}

		var isNgStyle = regexNgStyleRulesPropVal.test(' ' + targetElemNgStyleVal + ' ');
		var isZeroOver = (parseInt(targetElemNgStyleVal, 10) > 0);
		var isZeroUnder = (parseInt(targetElemNgStyleVal, 10) < 0);
		var isZero = (parseInt(targetElemNgStyleVal, 10) === 0);
		var isDefault = (targetElemNgStyleVal === targetElemNgStyleDefaultVal);
		var isInheritWithLineHeight = (that.controlFloat(parseFloat(targetElemNgStyleVal) * fontSizeScaleRate, 1) !== that.controlFloat(parseFloat(targetElemParentNgStyleVal), 1));
		var isInherit = (targetElemNgStyleVal === targetElemParentNgStyleVal);
		var isParentNgStyle = (regexNgStyleRulesPropVal.test(' ' + elemData.targetElemParentDisplayProp + ' '));

		//TODO: 以下の判定処理は、ズタボロ。全体的に修正する。
		//TODO: 0.00001とかの場合を考慮して、parseIntの10進数も考える
		//違反スタイルを検知してエラーもしくは警告をだす
		if(

			/////////////////////////////
			//is normal
			//
			// 一致
			(!isReverse && isNgStyle) ||

			//0以上
			(!isReverse && ngStylePropVal === 'over-0' && isZeroOver) ||

			//0以下
			(!isReverse && ngStylePropVal === 'under-0' && isZeroUnder) ||

			//デフォルト値の場合
			(!isReverse && ngStylePropVal === 'default' && isDefault) ||

			//継承スタイルの場合（line-height）
			(!isReverse && ngStylePropVal === 'inherit' && ngStyleProp === 'line-height' && isInheritWithLineHeight) ||

			//継承スタイルの場合（通常：line-height以外）
			(!isReverse && ngStylePropVal === 'inherit' && isInherit) ||

			//反転でない場合かつ、親要素がエラースタイルの場合
			(!isReverse && isParentCheking && isParentNgStyle) ||


			/////////////////////////////
			//is reverse
			//
			// 一致しない TODO: 実現できるか調査
//			(isReverse && !isNgStyle) ||

			//0以外
			(isReverse && ngStylePropVal === '0' && !isZero) ||

			//デフォルト値以外
			(isReverse && ngStylePropVal === 'default' && !isDefault) ||

			//継承スタイル以外（line-height）
			(isReverse && ngStylePropVal === 'inherit' && ngStyleProp === 'line-height' && !isInheritWithLineHeight) ||

			//継承スタイル以外（通常：line-height以外）
			(isReverse && ngStylePropVal === 'inherit' && !isInherit) ||

			//反転の場合かつ、親要素のOKスタイル以外に適合したら
			(isReverse && isParentCheking && !isParentNgStyle)

		){

			if(
				!(
					elemData.targetElem.classList.contains('stylev-target-error') ||
				 	elemData.targetElem.classList.contains('stylev-target-warning')
				)
			) {
				that.errorIndex++;
			}

			//エラーの発生した要素に、IDを振る
			elemData.targetElem.dataset.stylevid = that.errorIndex;

			//親要素を検査する場合
			if(isParentCheking) {
				result.text =
					'[' + rule['title'] + ']' + ' ' +
					'<' + elemData.targetElemTagName + '> ' +
					baseStylesText + ' ' +
					'parent element\'s style is ' +
					ngStyleProp + ': ' + targetElemParentNgStyleVal + ';' + ' ' +
					result.comment;
//					'display property of parent element is incorrect.' +
//					'(' + 'parent is ' + elemData.targetElemParentDisplayProp + ' element)';

			//通常時
			} else {
				result.text =
					'[' + rule['title'] + ']' + ' '+
					'<' + elemData.targetElemTagName + '>' + ' ' +
					baseStylesText + ' ' +
					ngStyleProp + ': ' + targetElemNgStyleVal + ';' + ' ' +
					result.comment;
			}

			//要素のID名
			result.idName = elemData.targetElem.dataset.stylevid;

			//エラーか警告かのタイプ
			result.errorLevel = splitTypeArray[splitTypeArray.length - 2];

			//メッセージ配列に挿入
			that.resultArray.push(result);

			//エラー
			if(result.errorLevel === 'error') {

				elemData.targetElem.classList.add('stylev-target-error');
			}

			//警告
			if(result.errorLevel === 'warning') {

				elemData.targetElem.classList.add('stylev-target-warning');
			}
		}
	},

	//バリデーション実行直前の初期化処理
	initializeBeforeValidation: function() {

		var that = STYLEV.VALIDATOR;

		//以下の処理の順序が重要

		//既にコンソールが出ている場合は、初期化するためコンソールを削除
		if(STYLEV.isValidated) {
			that.destroy();
		}

		//全要素を取得
		that.allElem = document.querySelectorAll('*:not(.stylev-ignore)');
		that.allElemLength = that.allElem.length;

		//エラー及び警告メッセージを管理する配列の初期化
		that.resultArray = [];

		//エラー数の初期化
		that.errorNum = 0;

		//警告数の初期化
		that.warningNum = 0;

		//エラー要素数のカウンター　※注意：エラーの数ではない
		that.errorIndex = 0;

		//アクティブ状態を戻す
		if(that.isUpdated) {
			that.isUpdated = false;
			that.consoleRefreshButtonImage.src = that.settings.ICON_REFRESH_PATH;
			that.consoleRefreshButtonImage.classList.remove('stylev-console-refresh-button-image-active');
		}

		//監視タイマーがある場合は、クリア
		if(that.observationTimer !== undefined) {

			clearTimeout(that.observationTimer);
		}

		//デフォルトスタイル取得用iframeを挿入
		that.insertIframe4getDefaultStyles();

		//Auto判定のためにDOMカスタムプロパティを全要素に付与
		that.setStyleDataBySelectors(document);
		that.setStyleDataBySelectors(that.iframeDocument);

	},

	//監視開始
	setupMutationObserver: function() {
		var that = STYLEV.VALIDATOR;

		//監視対象の属性を指定
		var targetAttributes = [
			'style',
			'class'
		];

		//監視する実行スパンをミリ秒で指定
		var OBSERVE_INTERVAL = 3000;//TODO: settingsに移行し、optionで設定できるようにする
		var IGNORING_ELEM_ARRAY_RESET_INTERVAL = 5000;//TODO: settingsに移行し、optionで設定できるようにする

		//consoleに出すメッセージの配列
		that.moMessageArray = [];

		//反応したとき無視するかどうか
		var isIgnore = true;

		that.observer = new MutationObserver(function (mutations) {

			that.informUpdating();

			//監視対象毎に
			mutationsLoop: for(var i = 0, mutationsLen = mutations.length; i < mutationsLen; i++) {

				var mutation = mutations[i];

				//無視する要素のIDと一致した場合、処理を中止
				var regexIgnoreElemsStylevId = new RegExp(' ' + STYLEV.ignoreElemsStylevId.join(' | ') + ' ');
				if(regexIgnoreElemsStylevId.test(' ' + mutation.target.dataset.stylevid + ' ')) {
					continue;
				}

				if(mutation.target.classList.contains('stylev-ignore')) {
					continue;
				}

				//TODO: 下部のaddedNodesと処理をまとめられるか？要確認
				//変更された要素がscriptタグでかつ、GAのスクリプトの場合は処理を中断
				for(var j = 0, addedNodes = mutation.addedNodes, addedNodesLen = addedNodes.length; j < addedNodesLen; j++) {
					var addedNode = addedNodes[j];
					if( addedNode.tagName.toLocaleLowerCase() === 'script' &&
						addedNode.src.indexOf('analytics.js') !== -1) {
						continue mutationsLoop;
					}
				}
				for(var k = 0, removedNodes = mutation.removedNodes, removeNodesLen = removedNodes.length; k < removeNodesLen; k++) {
					var removedNode = removedNodes[k];
					if( removedNode.tagName.toLocaleLowerCase() === 'script' &&
						removedNode.src.indexOf('analytics.js') !== -1) {
						continue mutationsLoop;
					}
				}

				//1つでも通過したら、無視しない
				isIgnore = false;

				//要素の記録が存在する場合
				if(STYLEV.affectedElemsStylevId.length) {

					//現在の要素と、1つ前の要素が同じ場合は、同一要素として数を数える※アニメーションなどで激しい属性変更が起きた場合に備える
					if(mutation.target.dataset.stylevid === STYLEV.affectedElemsStylevId[STYLEV.affectedElemsStylevId.length - 1]) {
						STYLEV.sameElemCount++;
					} else {
						STYLEV.sameElemCount = 0;
					}
				}

				//前回の要素と今回の要素が同じだった回数が5より少ない場合
				if(STYLEV.sameElemCount < 5) {

					//影響した要素のIDを保管
					STYLEV.affectedElemsStylevId.push(mutation.target.dataset.stylevid);

				} else {

					//初期化
					STYLEV.affectedElemsStylevId = [];
					STYLEV.sameElemCount = 0;
					STYLEV.ignoreElemsStylevId.push(mutation.target.dataset.stylevid);
				}

				if(mutation.target.tagName) {
					var attrsArray=[];
					for (var l = 0, attributes = mutation.target.attributes, attributesLen = attributes.length; l < attributesLen; l++){
						var attribute = attributes[l];
						attrsArray.push(' ' + attribute.nodeName + '="' + attribute.nodeValue + '"');
					}
					that.moMessageArray.push('<' + mutation.target.tagName.toLowerCase() + attrsArray.join(' ') + '>');
				}

				if(mutation.type === 'attributes') {
					that.moMessageArray.push(mutation.attributeName + ' ' + mutation.type + ' of above is changed from "' + mutation.oldValue + '".');
				}
				if(mutation.type === 'characterData') {
					that.moMessageArray.push(mutation.characterData + ' ' + mutation.type + ' of above is changed from "' + mutation.oldValue + '".');
				}
				for(var m = 0, addedNodes = mutation.addedNodes, addedNodesLen = addedNodes.length; m < addedNodesLen; m++) {
					var addedNode = addedNodes[m];
					that.moMessageArray.push(addedNode.outerHTML + ' is added.');
				}
				for(var n = 0, removedNodes = mutation.removedNodes, removedNodesLen = removedNodes.length; n < removedNodesLen; n++) {
					var removedNode = removedNodes[n];
					that.moMessageArray.push(removedNode.outerHTML + ' is removed.');
				}

				console.info('DOM modified...')

			}

			//監視タイマーがある場合は、クリア
			if(that.observationTimer !== undefined) {

				clearTimeout(that.observationTimer);
			}

			//監視タイマーの設定　※高速な連続反応に対応するため、実行を遅らせる
			that.observationTimer = setTimeout(function() {

				//無視しない場合
				if(!isIgnore) {

					//TODO: 共通化できないか調査
					if(STYLEV.isChromeExtension) {

						STYLEV.CHROME_EXTENSION.execute();
					}
					if(STYLEV.isBookmarklet) {

						that.execute();
					}

					console.info(that.moMessageArray.join('\n\n'));

					//consoleに出すメッセージの配列の初期化
					that.moMessageArray = [];

					//無視フラグの初期化
					isIgnore = true;

				}

			}, OBSERVE_INTERVAL);

			//定期的にリセットする
			that.resetTImer = setInterval(function() {
				STYLEV.ignoreElemsStylevId = [];
			}, IGNORING_ELEM_ARRAY_RESET_INTERVAL);
		});

		//TODO: 属性の監視を止めて、スタイル情報を監視する形に変更するか検討
		//対象要素の配下の全要素を監視し、ノードの追加・変更・削除と属性の追加・変更・削除を検知
		var observationConfig = {
			attributes: true,
			attributeFilter: targetAttributes,
			childList: true,
			subtree: true,
			attributeOldValue: true,
			characterDataOldValue: true

		};

		return {

			connect: function() {
				if(!STYLEV.options.ENABLE_MUTATION_OBSERVER) {
					return true;
				}
				if(!that.isObserving) {
					//TODO: 属性回避ができれば、全要素を対象に変更
					//that.observer.observe(that.html, observationConfig);
					that.observer.observe(that.body, observationConfig);
					that.observer.observe(that.head, observationConfig);
					that.isObserving = true;
					console.info('Mutation Observer has connected');
				}
				return false;
			},

			disconnect: function() {
				if(!STYLEV.options.ENABLE_MUTATION_OBSERVER) {
					return true;
				}
				if(that.isObserving) {
					clearTimeout(that.observationTimer);
					clearTimeout(that.resetTImer);
					that.observer.disconnect();
					that.isObserving = false;
					console.info('Mutation Observer has disconnected');
				}
				return false;
			}
		}

	},

	//スタイルシート挿入
	insertStylesheet: function() {

		var that = STYLEV.VALIDATOR;

		that.linkTag = document.createElement('link');
		that.linkTag.id = that.settings.STYLESHEET_ID;
		that.linkTag.rel = 'stylesheet';
		that.linkTag.type = 'text/css';
		that.linkTag.classList.add('stylev-ignore');
		that.linkTag.href = that.settings.STYLESHEET_PATH;

		/* append */
		that.head.appendChild(that.linkTag);
	},

	//スタイルシートを削除
	removeStylesheet: function() {
		var that = STYLEV.VALIDATOR;

		that.linkTag.parentElement.removeChild(that.linkTag);
	},

	//コンソールを削除
	removeConsole: function() {
		var that = STYLEV.VALIDATOR;

		that.consoleWrapper.parentElement.removeChild(that.consoleWrapper);

		//ログ表示領域分の余白を初期化
		that.html.style.setProperty('border-bottom-width', that.htmlDefaultBorderBottomWidth, '');

	},

	//デフォルトスタイルを取得するために、ダミーiframeを挿入
	insertIframe4getDefaultStyles: function() {

		var that = STYLEV.VALIDATOR;

		that.iframe4test = document.createElement('iframe');
		that.iframe4test.id = 'stylev-dummy-iframe';
		that.html.appendChild(that.iframe4test);
		that.iframeWindow = that.iframe4test.contentWindow;
		that.iframeDocument = that.iframeWindow.document;
		that.iframeBody = that.iframeDocument.querySelector('body');

		var docFlag = document.createDocumentFragment();

		for(var i = 0, len = that.tagsAllData.length; i < len; i++) {
			docFlag.appendChild(document.createElement(that.tagsAllData[i]));
		}

		that.iframeBody.appendChild(docFlag);

	},

	//ダミーiframeを削除
	removeIframe4getDefaultStyles: function() {
		var that = STYLEV.VALIDATOR;

		that.iframe4test.parentElement.removeChild(that.iframe4test);
	},

	//全要素のclassを削除する関数
	removeAllAttrAndEvents: function() {
		var that = STYLEV.VALIDATOR;

		//属性やclassNameを削除
		for(var i = 0, len = that.allElemLength; i < len; i++) {
			var elem = that.allElem[i];
			elem.removeAttribute('data-stylevid');
			elem.removeAttribute('data-stylevclass');
			elem.classList.remove('stylev-target-error');
			elem.classList.remove('stylev-target-warning');
			elem.removeEventListener('click', STYLEV.CHROME_DEVTOOLS.inspectFromTargets);
			elem.removeEventListener('click', that.markElementFromTargets);
		}

		if(that.html !== undefined) {
			that.html.removeEventListener('keyup', that.destroyByEsc);
		}
	},

	informUpdating: function() {
		var that = STYLEV.VALIDATOR;

		if(that.isUpdated) {
			return true;
		}
		that.isUpdated = true;
		that.consoleRefreshButtonImage.src = that.settings.ICON_REFRESH_ACTIVE_PATH;
		that.consoleRefreshButtonImage.classList.add('stylev-console-refresh-button-image-active');

		return false;
	},

	insertStyle2ShadowDOM: function() {
		var that = STYLEV.VALIDATOR;
		that.consoleWrapperShadowRoot.innerHTML = '<style>@import "' + that.RESOURCE_ROOT + 'style-validator-for-console.css' + '";</style>';
	},

	//結果を表示させる
	showConsole: function() {

		var that = STYLEV.VALIDATOR;

		//ドキュメンとフラグメント
		that.docFlag = document.createDocumentFragment();

		//要素を生成
		that.consoleWrapper = document.createElement('div');
		that.consoleWrapperShadowRoot = that.consoleWrapper.createShadowRoot();
		that.consoleHeader = document.createElement('header');
		that.consoleHeading = document.createElement('h1');
		that.consoleHeadingLogo = document.createElement('a');
		that.consoleHeadingLogoImage = document.createElement('img');
		that.consoleMode = document.createElement('p');
		that.consoleButtons = document.createElement('div');
		that.consoleRefreshButton = document.createElement('a');
		that.consoleRefreshButtonImage = document.createElement('img');
		that.consoleCounter = document.createElement('div');
		that.consoleBody = document.createElement('div');
		that.consoleList = document.createElement('ul');
		that.consoleCloseButton = document.createElement('a');
		that.consoleCloseButtonImage = document.createElement('img');
		that.consoleMinimizeButton = document.createElement('a');
		that.consoleMinimizeButtonImage = document.createElement('img');
		that.consoleNormalizeButton = document.createElement('a');
		that.consoleNormalizeButtonImage = document.createElement('img');

		//クリック時の判定
		that.isMouseDownConsoleHeader = false;

		//ドラッグアンドドロップで移動させる処理に必要な変数
		that.consoleStartPosY = 0;
		that.consoleCurrentPosY = 0;
		that.consoleDiffPosY = 0;

		//属性を設定
		that.consoleWrapper.id = that.settings.CONSOLE_WRAPPER_ID;
		that.consoleWrapper.classList.add('stylev-ignore');
		that.consoleList.id = that.settings.CONSOLE_LIST_ID;
		that.consoleHeader.classList.add('stylev-console-header');
		that.consoleHeading.classList.add('stylev-console-heading');
		that.consoleHeadingLogo.classList.add('stylev-console-heading-logo');
		that.consoleHeadingLogoImage.classList.add('stylev-console-heading-logo-image');
		that.consoleHeadingLogoImage.src = that.settings.ICON_LOGO_PATH;
		that.consoleMode.classList.add('stylev-console-mode');
		that.consoleButtons.classList.add('stylev-console-buttons');
		that.consoleRefreshButton.href = 'javascript: void(0);';
		that.consoleRefreshButton.classList.add('stylev-console-refresh-button');
		that.consoleRefreshButtonImage.classList.add('stylev-console-refresh-button-image');
		that.consoleRefreshButtonImage.src = that.settings.ICON_REFRESH_PATH;
		that.consoleCounter.classList.add('stylev-console-counter');
		that.consoleBody.classList.add('stylev-console-body');
		that.consoleList.classList.add('stylev-console-list');
		that.consoleCloseButton.href = 'javascript: void(0);';
		that.consoleCloseButton.classList.add('stylev-console-close-button');
		that.consoleCloseButtonImage.classList.add('stylev-console-close-button-image');
		that.consoleCloseButtonImage.src = that.settings.ICON_CLOSE_PATH;
		that.consoleMinimizeButton.href = 'javascript: void(0);';
		that.consoleMinimizeButton.classList.add('stylev-console-minimize-button');
		that.consoleMinimizeButtonImage.classList.add('stylev-console-minimize-button-image');
		that.consoleMinimizeButtonImage.src = that.settings.ICON_MINIMIZE_PATH;
		that.consoleNormalizeButton.href = 'javascript: void(0);';
		that.consoleNormalizeButton.hidden = true;
		that.consoleNormalizeButton.classList.add('stylev-console-normalize-button');
		that.consoleNormalizeButtonImage.classList.add('stylev-console-normalize-button-image');
		that.consoleNormalizeButtonImage.src = that.settings.ICON_NORMALIZE_PATH;

		//コンソールのスタイルを指定
		that.insertStyle2ShadowDOM();

		//コンソール内に表示させる結果の要素を生成
		that.createMessagesInConsole();

		//コンソール関連の動作のイベントの登録
		that.bindEvents4Console();

			//コンソールヘッダに表示させるテキストの設定
		that.consoleHeadingText = document.createTextNode(that.settings.CONSOLE_HEADING_TEXT);
		that.consoleCounter.textContent = 'Total: ' + that.resultArray.length + ' / Error: ' + that.errorNum + ' / Warning: ' + that.warningNum;

		//ロゴを挿入
		that.consoleHeadingLogo.appendChild(that.consoleHeadingLogoImage);
//		that.consoleHeadingLogo.appendChild(that.consoleHeadingText);
		that.consoleHeading.appendChild(that.consoleHeadingLogo);

		//ボタンの中に画像を配置
		that.consoleRefreshButton.appendChild(that.consoleRefreshButtonImage);
		that.consoleNormalizeButton.appendChild(that.consoleNormalizeButtonImage);
		that.consoleMinimizeButton.appendChild(that.consoleMinimizeButtonImage);
		that.consoleCloseButton.appendChild(that.consoleCloseButtonImage);

		//コンソールヘッダにボタンを配置
		that.consoleButtons.appendChild(that.consoleRefreshButton);
		that.consoleButtons.appendChild(that.consoleMinimizeButton);
		that.consoleButtons.appendChild(that.consoleNormalizeButton);
		that.consoleButtons.appendChild(that.consoleCloseButton);

		//コンソール内に挿入するHTML要素を挿入 TODO: 同じ記述をまとめる
		that.consoleHeader.appendChild(that.consoleHeading);
		that.consoleHeader.appendChild(that.consoleButtons);
		that.consoleHeader.appendChild(that.consoleCounter);
		that.consoleHeader.appendChild(that.consoleMode);
		that.consoleWrapperShadowRoot.appendChild(that.consoleHeader);
		that.consoleWrapperShadowRoot.appendChild(that.consoleBody);
		that.consoleList.appendChild(that.docFlag);
		that.consoleBody.appendChild(that.consoleList);
		that.html.appendChild(that.consoleWrapper);

		that.doAfterShowingConsole();
	},

	doAfterShowingConsole: function() {

		var that = STYLEV.VALIDATOR;

		setTimeout(function() {

			that.consoleWrapper.style.setProperty('height', (STYLEV.consoleWrapperHeight || that.settings.CONSOLE_WRAPPER_DEFAULT_HEIGHT) + 'px', '');

			//コンソールの包括要素のデフォルトの高さを計算し記憶しておく
			that.consoleWrapperDynamicHeight = parseInt(that.consoleWrapper.offsetHeight, 10);

			//コンソールの包括要素の高さ分だけ最下部に余白をつくる
			//コンソールで隠れる要素がでないための対応
			that.html.style.setProperty('border-bottom-width', that.consoleWrapperDynamicHeight + 'px', 'important');

			//表示結果をChrome Extensionに伝える
			that.send2ChromeExtension();

			//前回開いた状態を復元する
			that.restorePreviousCondition();
		}, 0);
	},

	send2ChromeExtension: function() {

		var that = STYLEV.VALIDATOR;

		if(STYLEV.isChromeExtension) {

			//アイコンに件数を表示させる
			chrome.runtime.sendMessage({
				setBadgeText: that.resultArray.length
			});

			//DevToolsの接続状態を表示させる
			chrome.runtime.sendMessage({

				name: 'switchMode'

			}, function(message) {

				if(message.isConnected2Devtools !== undefined) {

					var consoleModeImage = document.createElement('img');
					var consoleModeText = document.createTextNode(message.isConnected2Devtools ? that.settings.CONNECTED_2_DEVTOOLS_MESSAGE : that.settings.DISCONNECTED_2_DEVTOOLS_MESSAGE);
					consoleModeImage.classList.add('stylev-console-mode-image');
					consoleModeImage.src = message.isConnected2Devtools ? that.settings.ICON_CONNECTED_PATH : that.settings.ICON_DISCONNECTED_PATH;
					that.consoleMode.appendChild(consoleModeImage);
					that.consoleMode.appendChild(consoleModeText);
					that.consoleMode.classList.add(message.isConnected2Devtools ? that.settings.CONNECTED_2_DEVTOOLS_CLASS : that.settings.DISCONNECTED_2_DEVTOOLS_CLASS);
				}
			});
		}

	},

	//前回開いた状態を復元する
	restorePreviousCondition: function() {

		var that = STYLEV.VALIDATOR;

		//前回のスクロール値まで移動　それがなければ、0がはいる
		setTimeout(function() {
			that.consoleList.scrollTop = STYLEV.consoleScrollTop;
		}, 0);

		//スクロール値を記憶　TODO: イベント削除をいれる　必要ないか・・・一度消えるし今は
		that.consoleList.addEventListener('scroll', function() {
			STYLEV.consoleScrollTop = event.currentTarget.scrollTop;
		});

		//最後にフォーカスしていた要素に対して、インスペクト
		if(typeof STYLEV.CHROME_DEVTOOLS.inspectOfConsoleAPI === 'function') {
			STYLEV.CHROME_DEVTOOLS.inspectOfConsoleAPI();
		}

		//選択した行があった場合、選択した行と現在のリストを比べて、同一のものに選択状態のclassを付与
		if(STYLEV.selectedLineInConsole) {
			var listItems = that.consoleList.querySelectorAll('li');
			for(var i = 0, len = listItems.length; i < len; i++) {
				if(listItems[i].innerHTML === STYLEV.selectedLineInConsole.innerHTML) {
					listItems[i].classList.add('stylev-trigger-selected');
					break;
				}
			}
		}
	},

	//コンソール内に表示させる結果の要素を生成
	createMessagesInConsole: function() {

		var that = STYLEV.VALIDATOR;

		//エラーや警告が1件もなかった場合
		if(that.resultArray.length === 0) {

			that.congratulationsMessage = document.createElement('li');
			that.congratulationsMessage.classList.add('stylev-console-perfect');
			that.congratulationsMessage.textContent = that.settings.CONGRATULATION_MESSAGE_TEXT;
			that.docFlag.appendChild(that.congratulationsMessage);

		//エラーや警告が存在した場合
		} else {

			//メッセージの数だけループ
			for(var i = 0, len = that.resultArray.length; i < len; i++) {

				//ログの行を表示させるHTML要素を生成
				var li = document.createElement('li');
				var anchor = document.createElement('a');
				var logID = document.createElement('span');
				var why = document.createElement('a');
				var result = that.resultArray[i];

				//属性を設定
				anchor.href = 'javascript: void(0);';

				//クリックイベントを設定
				anchor.addEventListener('click', that.markElementFromConsole.bind(that, result), false);

				//テキスト情報を挿入
				anchor.textContent = result.text;
				logID.textContent = result.idName;
				why.textContent = '?';

				//属性を設定
				anchor.dataset.stylevconsoleid = result.idName;
				anchor.classList.add('stylev-console-list-anchor');
				logID.classList.add('stylev-console-list-logid');
				why.classList.add('stylev-console-list-why');
				why.href = result.referenceURL;

				//エラー数をカウント
				if(result.errorLevel === 'error') {

					//エラーか警告のタイプのクラス名を設定
					li.classList.add('stylev-trigger-error');
					that.errorNum++;
				}

				//警告数をカウント
				if(result.errorLevel === 'warning') {

					//エラーか警告のタイプのクラス名を設定
					li.classList.add('stylev-trigger-warning');
					that.warningNum++;
				}

				//DocumentFlagmentにHTML要素を挿入
				li.appendChild(anchor);
				logID.appendChild(why);
				li.appendChild(logID);
				that.docFlag.appendChild(li);
			}
		}
	},

	//コンソール関連のイベントを登録
	bindEvents4Console: function() {
		var that = STYLEV.VALIDATOR;

		that.consoleWrapper.addEventListener('click', function() {
			event.preventDefault();
			event.stopPropagation();
		}, false);

		that.consoleHeader.addEventListener('mousedown', function() {
			event.preventDefault();
			event.stopPropagation();
			that.isMouseDownConsoleHeader = true;
			that.consoleStartPosY = event.pageY;
		}, false);

		that.html.addEventListener('mousemove', function() {
			event.preventDefault();
			event.stopPropagation();

			if(that.isMouseDownConsoleHeader) {
				that.consoleCurrentPosY = event.pageY;
				that.consoleDiffPosY = that.consoleStartPosY - that.consoleCurrentPosY;
				that.consoleWrapper.style.setProperty('height', (that.consoleWrapperDynamicHeight + that.consoleDiffPosY) + 'px', '');
				event.currentTarget.style.setProperty('border-bottom-width', that.consoleWrapperDynamicHeight + that.consoleDiffPosY + 'px', 'important');

				if(that.consoleWrapper.offsetHeight === 30) {
					that.consoleNormalizeButton.hidden = false;
					that.consoleMinimizeButton.hidden = true;
				} else if(that.consoleWrapper.offsetHeight > 30) {
					that.consoleNormalizeButton.hidden = true;
					that.consoleMinimizeButton.hidden = false;
				}
			}
		}, false);

		that.html.addEventListener('mouseup', function() {
			event.preventDefault();
			event.stopPropagation();
			if(that.isMouseDownConsoleHeader) {
				that.consoleWrapperDynamicHeight = parseInt(that.consoleWrapper.offsetHeight, 10);
				STYLEV.consoleWrapperHeight = that.consoleWrapperDynamicHeight;
			}
			that.isMouseDownConsoleHeader = false;
		}, false);

		that.consoleCloseButton.addEventListener('click', function() {
			that.destroy();
		}, false);

		that.consoleRefreshButton.addEventListener('click', function() {
			that.validate();
		}, false);

		that.consoleMinimizeButton.addEventListener('click', function() {
			this.hidden = true;
			that.consoleNormalizeButton.hidden = false;
			that.minimize();
		}, false);

		that.consoleNormalizeButton.addEventListener('click', function() {
			this.hidden = true;
			that.consoleMinimizeButton.hidden = false;
			that.normalize();
		}, false);

		that.html.addEventListener('keyup', that.destroyByEsc, false);
	},

	destroyByEsc: function() {
		var that = STYLEV.VALIDATOR;

		if(event.keyCode === 27) {
			that.destroy();
		}
	},

	//コンソールからの動作
	markElementFromConsole: function(result) {

		event.preventDefault();
		event.stopPropagation();

		var that = STYLEV.VALIDATOR;

		//監視を中断
		that.moManager.disconnect();

		//TODO: 全体的に、再取得と削除できないか調査
		var wrapper = document.querySelector('#stylev-console-wrapper').shadowRoot;
		var lines = wrapper.querySelectorAll('li');

		//全ての行から選択状態を外す
		for(var i = 0, len = lines.length; i < len; i++) {
			lines[i].classList.remove('stylev-trigger-selected');
		}

		//クリックした行と同じidを持つ行に選択状態を付加
		var triggers = wrapper.querySelectorAll('[data-stylevconsoleid="' + event.currentTarget.dataset.stylevconsoleid + '"]');
		for(var i = 0, len = triggers.length; i < len; i++) {

			var trigger = triggers[i];
			trigger.parentElement.classList.add('stylev-trigger-selected');
			if(i === 0) {
				STYLEV.selectedLineInConsole = trigger.parentElement;
			}
		}

		//全ての対象要素から選択状態を外し、クリックした要素に選択状態を付加
		for(var j = 0, allElemLen = that.allElem.length; j < allElemLen; j++) {
			that.allElem[j].classList.remove('stylev-target-selected');
		}
		var target = document.querySelector('[data-stylevid="' + result.idName + '"]');
		target.classList.add('stylev-target-selected');

		//対象の要素までスクロール
		STYLEV.methods.smoothScroll.execute(target);

		//監視を復活
		that.moManager.connect();

	},

	//ページ内の要素に対する動作
	bind4targetElements: function() {

		var that = STYLEV.VALIDATOR;

		//エラーや警告が１件もなければ何もしない
		if(that.resultArray.length === 0) {
			return false;
		}

		//TODO: 全体的に、再取得と削除できないか調査
		that.consoleWrapper = document.querySelector('#stylev-console-wrapper');
		that.consoleWrapperShadowRoot = that.consoleWrapper.shadowRoot;
		that.consoleTriggerWrapper = that.consoleWrapperShadowRoot.querySelector('ul');
		that.consoleTriggers = that.consoleWrapperShadowRoot.querySelectorAll('li');
		that.targets = document.querySelectorAll('.stylev-target-error, .stylev-target-warning');

		for(var i = 0, len = that.targets.length; i < len; i++) {
			var target = that.targets[i];
			target.addEventListener('click', that.markElementFromTargets, false);
		}

		return false;
	},
	//TODO: markElementFromConsole内の処理が似通っているため上手くまとめる。全要素をループしている最中に埋め込むか
	//TODO: あと結構やっつけ処理になっているので後で整理
	markElementFromTargets: function() {

		var that = STYLEV.VALIDATOR;

		//監視を中断
		that.moManager.disconnect();

		event.stopPropagation();
		event.preventDefault();

		//TODO: 全体的に、再取得と削除できないか調査
		var wrapper = document.querySelector('#stylev-console-wrapper').shadowRoot;

		//コンソールの全ての行から選択状態を外し、クリックした行に選択状態を付加
		for(var i = 0, consoleTriggersLen = that.consoleTriggers.length; i < consoleTriggersLen; i++) {
			that.consoleTriggers[i].classList.remove('stylev-trigger-selected');
		}
		var triggers = wrapper.querySelectorAll('[data-stylevconsoleid="' + event.currentTarget.dataset.stylevid + '"]');

		for(var i = 0, triggersLen = triggers.length; i < triggersLen; i++) {
			var trigger = triggers[i];
			trigger.parentElement.classList.add('stylev-trigger-selected');

			//選択した行として、複数ある内の最初の要素を記憶
			if(i === 0) {
				STYLEV.selectedLineInConsole = trigger.parentElement;
			}
		}

		//全ての対象要素から選択状態を外し、クリックした要素に選択状態を付加
		for(var j = 0, len = that.allElem.length; j < len; j++) {
			that.allElem[j].classList.remove('stylev-target-selected');
		}
		var target = document.querySelector('[data-stylevid="' + event.currentTarget.dataset.stylevid + '"]');
		target.classList.add('stylev-target-selected');

		//複数ある場合は先頭の行にランディング
		var distance = triggers[0].offsetTop;

		//コンソール内の対象要素の行を先頭に
		that.consoleTriggerWrapper.scrollTop = distance;

		//監視を復活
		that.moManager.connect();

	},

	//四捨五入で指定された小数点以下を切り捨てる
	controlFloat: function(targetVal, pointPos) {
		return Math.round(parseFloat(targetVal) * Math.pow(10, pointPos)) / Math.pow(10, pointPos);
	},

	//全てを削除
	destroy: function() {
		var that = STYLEV.VALIDATOR;

		that.removeAllAttrAndEvents();
		that.removeConsole();

		if(that.moManager !== undefined) {
			that.moManager.disconnect();
		}

		if(STYLEV.isBookmarklet) {
			that.removeStylesheet();
		}

		if(STYLEV.isChromeExtension) {
			setTimeout(function() {//Fix Timing Bug
				chrome.runtime.sendMessage({name: 'validatedStatus2False'});
			}, 0);
		}

		STYLEV.isValidated = false;

		console.info('Style Validator has removed.')
	},

	minimize: function() {
		var that = STYLEV.VALIDATOR;
		that.consoleWrapper.style.setProperty('height', that.consoleHeader.style.getPropertyValue('height'), '');
		that.consoleWrapperDynamicHeight = that.consoleWrapper.offsetHeight;
	},

	normalize: function() {
		var that = STYLEV.VALIDATOR;
		that.consoleWrapper.style.setProperty('height', that.settings.CONSOLE_WRAPPER_DEFAULT_HEIGHT + 'px', '');
		that.consoleWrapperDynamicHeight = that.consoleWrapper.offsetHeight;
	},

	setStyleDataBySelectors: function(document) {
		var that = STYLEV.VALIDATOR;

		var stylesheets = document.styleSheets;

		for(var i = 0, len = stylesheets.length; i < len; i++) {

			var stylesheet = stylesheets[i];
			var cssRules = stylesheet.cssRules;

			if(cssRules === null) {
				continue;
			}

			for(var j = 0, rulesLength = cssRules.length; j < rulesLength; j++) {

				var cssRule = cssRules[j];

				//TODO: support media query and keyframes and etc....
				if(cssRule.media || cssRule.style === undefined || cssRule.selectorText === undefined) {
					continue;
				}

				var selectorsOfCssRules = cssRule.selectorText;
				var styleOfCssRules = cssRule.style;
				var widthOfCssRules = !!styleOfCssRules.width ? styleOfCssRules.width : 'auto';
				var heightOfCssRules = !!styleOfCssRules.height ? styleOfCssRules.height : 'auto';

				var importantOfWidthOfCssRules = styleOfCssRules.getPropertyPriority('width');
				var importantOfHeightOfCssRules = styleOfCssRules.getPropertyPriority('height');
				var specificityArrayOfCssRules = SPECIFICITY.calculate(selectorsOfCssRules);

				//selectorの数分だけループ
				for(var k = 0, specificityArrayOfCssRulesLength = specificityArrayOfCssRules.length; k < specificityArrayOfCssRulesLength; k++) {

					var specificityObjectOfCssRules = specificityArrayOfCssRules[k];

					var selectorOfCssRules = specificityObjectOfCssRules.selector;
					var specificityOfCssRules = parseInt(specificityObjectOfCssRules.specificity.replace(/,/g, ''), 10);
					try {
						var targetsFromCssRules = document.querySelectorAll(selectorOfCssRules);
					} catch(e){
						continue;
					}
					for(var l = 0, targetsLength = targetsFromCssRules.length; l < targetsLength; l++) {

						var target = targetsFromCssRules[l];
						var styleOfStyleAttr = target.style;
						var widthOfStyleAttr = !!styleOfStyleAttr.width ? styleOfStyleAttr.width : 'auto';
						var heightOfStyleAttr = !!styleOfStyleAttr.height ? styleOfStyleAttr.height : 'auto';

						var specificityOfWidth = widthOfStyleAttr ? 1000 : specificityOfCssRules;
						var specificityOfHeight = heightOfStyleAttr ? 1000 : specificityOfCssRules;

						var importantOfWidthOfStyleAttr = styleOfStyleAttr.getPropertyPriority('width');
						var importantOfHeightOfStyleAttr = styleOfStyleAttr.getPropertyPriority('height');

						//initialize
						if( target.dataset_stylevwidthspecificity === undefined ) {
							target.dataset_stylevwidthspecificity = specificityOfWidth;
						}
						if( target.dataset_stylevheightspecificity === undefined ) {
							target.dataset_stylevheightspecificity = specificityOfHeight;
						}
						if( target.dataset_stylevwidthimportant === undefined ) {
							target.dataset_stylevwidthimportant = importantOfWidthOfStyleAttr;
						}
						if( target.dataset_stylevheightimportant === undefined ) {
							target.dataset_stylevheightimportant = importantOfHeightOfStyleAttr;
						}

						//TODO: 同じような処理まとめる
						//TODO: IDだけつけて、他のデータ属性は追加しないようにする
						//TODO: もう1パターン？
						//CSS指定がありstyle属性がない
						if(widthOfCssRules && !widthOfStyleAttr) {
							if( specificityOfWidth >= parseInt(target.dataset_stylevwidthspecificity, 10) &&
								importantOfWidthOfCssRules.length >= target.dataset_stylevwidthimportant.length
							) {
								target.dataset_stylevwidth = widthOfCssRules;
								target.dataset_stylevwidthspecificity = specificityOfWidth;
								target.dataset_stylevwidthimportant = importantOfWidthOfCssRules;
							}
						}
						//importantのCSS指定とstyle属性
						if(widthOfCssRules && importantOfWidthOfCssRules && !importantOfWidthOfStyleAttr) {

							if( specificityOfWidth >= parseInt(target.dataset_stylevwidthspecificity, 10) &&
								importantOfWidthOfCssRules.length >= target.dataset_stylevwidthimportant.length
							) {
								target.dataset_stylevwidth = widthOfCssRules;
								target.dataset_stylevwidthspecificity = specificityOfWidth;
								target.dataset_stylevwidthimportant = importantOfWidthOfCssRules;
							}
						}
						//非importantのCSS指定とstyle属性
						if(widthOfCssRules && !importantOfWidthOfCssRules && widthOfStyleAttr) {

							if( specificityOfWidth >= parseInt(target.dataset_stylevwidthspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevwidthimportant.length
							) {
								target.dataset_stylevwidth = widthOfStyleAttr;
								target.dataset_stylevwidthspecificity = specificityOfWidth;
								target.dataset_stylevwidthimportant = importantOfWidthOfStyleAttr;
							}
						}
						//style属性かつimportant
						if(widthOfStyleAttr && importantOfWidthOfStyleAttr) {
							if( specificityOfWidth >= parseInt(target.dataset_stylevwidthspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevwidthimportant.length
							) {
								target.dataset_stylevwidth = widthOfStyleAttr;
								target.dataset_stylevwidthspecificity = specificityOfWidth;
								target.dataset_stylevwidthimportant = importantOfWidthOfStyleAttr;
							}
						}


						//CSS指定がありstyle属性がない
						if(heightOfCssRules && !heightOfStyleAttr) {
							if( specificityOfHeight >= parseInt(target.dataset_stylevheightspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevheightimportant.length
							) {
								target.dataset_stylevheight = heightOfCssRules;
								target.dataset_stylevheightspecificity = specificityOfHeight;
								target.dataset_stylevheightimportant = importantOfHeightOfStyleAttr;
							}
						}
						//CSS指定がありimportantとstyle属性
						if(heightOfCssRules && importantOfHeightOfCssRules && heightOfStyleAttr) {
							if( specificityOfHeight >= parseInt(target.dataset_stylevheightspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevheightimportant.length
							) {
								target.dataset_stylevheight = heightOfCssRules;
								target.dataset_stylevheightspecificity = specificityOfHeight;
								target.dataset_stylevheightimportant = importantOfHeightOfStyleAttr;
							}
						}

						//CSS指定があり非importantとstyle属性
						if(heightOfCssRules && !importantOfHeightOfCssRules && heightOfStyleAttr) {
							if( specificityOfHeight >= parseInt(target.dataset_stylevheightspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevheightimportant.length
							) {
								target.dataset_stylevheight = heightOfStyleAttr;
								target.dataset_stylevheightspecificity = specificityOfHeight;
								target.dataset_stylevheightimportant = importantOfHeightOfStyleAttr;
							}
						}
						//style属性かつimportant
						if(heightOfStyleAttr && importantOfHeightOfStyleAttr) {
							if( specificityOfHeight >= parseInt(target.dataset_stylevheightspecificity, 10) &&
								importantOfWidthOfStyleAttr.length >= target.dataset_stylevheightimportant.length
							) {
								target.dataset_stylevheight = heightOfStyleAttr;
								target.dataset_stylevheightspecificity = specificityOfHeight;
								target.dataset_stylevheightimportant = importantOfHeightOfStyleAttr;
							}
						}

					}
				}

			}
		}

		that.setStyleDataByElements(document);

	},

	setStyleDataByElements: function(document) {

		var elements = document.querySelectorAll('*');

		for(var g = 0, elementsLength = elements.length; g < elementsLength; g++) {

			var element = elements[g];

			if(element.dataset_stylevwidth === undefined) {


				var widthValue = element.style.getPropertyValue('width');
				if(widthValue) {
					element.dataset_stylevwidth = widthValue;
				} else {
					element.dataset_stylevwidth = 'auto';
				}

			}
			if(element.dataset_stylevheight === undefined) {

				var heightValue = element.style.getPropertyValue('height');
				if(heightValue) {
					element.dataset_stylevheight = heightValue;
				} else {
					element.dataset_stylevheight = 'auto';
				}
			}

		}
	},

	getStyle: function(target, property, pseudo) {

		var culculatedValue;
		var pseudoSelector = pseudo || null;
		var computedPropertyValue = getComputedStyle(target, pseudoSelector).getPropertyValue(property);

		if( property === 'width' || property === 'height' ) {

			if(property === 'width') {
				culculatedValue = target.dataset_stylevwidth;
			}

			if(property === 'height') {
				culculatedValue = target.dataset_stylevheight;
			}

		} else {

			culculatedValue = computedPropertyValue;
		}

		return culculatedValue;
	}

};


STYLEV.methods = {

	//スムーススクロール TODO: 親要素を指定してインナースクロールにも対応させる
	smoothScroll: {

		//トップ座標を取得
		getOffsetTop: function(target) {

			if(target.nodeName.toLowerCase() === 'html') {
				return -window.pageYOffset;
			} else {
				return target.getBoundingClientRect().top + window.pageYOffset;
			}
		},

		//イージング
		easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; },

		//対象要素の位置取得
		getTargetPos: function(start, end, elapsed, duration) {

			var that = STYLEV.methods.smoothScroll;

			if (elapsed > duration) return end;
			return start + (end - start) * that.easeInOutCubic(elapsed / duration); // <-- you can change the easing funtion there
		},

		//実行
		execute: function(target, duration) {

			var that = STYLEV.methods.smoothScroll;

			var duration = duration || 500;
			var scrollTopY = window.pageYOffset;
			var targetPosY = that.getOffsetTop(target) - 100;

			var clock = Date.now();

			var requestAnimationFrame =
				window.requestAnimationFrame ||
					window.mozRequestAnimationFrame ||
					window.webkitRequestAnimationFrame ||
					function(fn){window.setTimeout(fn, 15);};

			//進度を計算し、スクロールさせる
			var step = function() {
				var elapsed = Date.now() - clock;
				window.scroll(0, that.getTargetPos(scrollTopY, targetPosY, elapsed, duration));
				if(elapsed <= duration) {
					requestAnimationFrame(step);
				}
			};
			step();
		}
	}

};

//Chrome Extension
STYLEV.CHROME_EXTENSION = {

	execute: function() {

		console.info('Style Validator by Chrome Extension');

		setTimeout(function() {//Fix Timing Bug
			chrome.runtime.sendMessage({name: 'execute'});
		}, 0);

	}

};

//DevToolsページ内で使うコンソールAPI関数を登録する
STYLEV.CHROME_DEVTOOLS = {

	execute: function(inspectOfConsoleAPI) {

		var that = STYLEV.CHROME_DEVTOOLS;

		//エラーや警告が１件もなければ何もしない
		if(STYLEV.VALIDATOR.resultArray.length === 0) {
			return false;
		}
		that.inspectOfConsoleAPI = inspectOfConsoleAPI;
		that.setParameters();
		that.bindEvents();

		return false;
	},

	setParameters: function() {
		var that = STYLEV.CHROME_DEVTOOLS;

		//TODO: 全体的に、再取得と削除できないか調査
		that.consoleWrapper = document.querySelector('#stylev-console-wrapper');
		that.consoleWrapperShadowRoot = that.consoleWrapper.shadowRoot;
		that.consoleList = that.consoleWrapperShadowRoot.querySelector('#stylev-console-list');
		that.triggers = that.consoleList.querySelectorAll('a[data-stylevconsoleid]');
		that.targets = document.querySelectorAll('.stylev-target-error, .stylev-target-warning');
	},

	bindEvents: function() {
		var that = STYLEV.CHROME_DEVTOOLS;

		for(var i = 0, triggersLen = that.triggers.length; i < triggersLen; i++) {
			that.triggers[i].addEventListener('click', that.inspectFromConsole, false);
		}

		for(var j = 0, targetsLen = that.targets.length; j < targetsLen; j++) {
			that.targets[j].addEventListener('click', that.inspectFromTargets, false);
		}
	},

	//コンソールからインスペクト
	inspectFromConsole: function(){

		event.preventDefault();
		event.stopPropagation();

		var that = STYLEV.CHROME_DEVTOOLS;

		var trigger = event.currentTarget;
		var targetID = trigger.dataset.stylevconsoleid;
		var targetElem = document.querySelector('[data-stylevid="' + targetID + '"]');

		try {
			that.inspectOfConsoleAPI(targetElem);
		} catch(e) {
			console.error(e);
		}

	},

	//対象要素からインスペクトする
	inspectFromTargets: function() {

		event.preventDefault();
		event.stopPropagation();

		var that = STYLEV.CHROME_DEVTOOLS;

		var target = event.target;

		try {
			that.inspectOfConsoleAPI(target);
		} catch(e) {
			console.error(e);
		}

	}
}


//Chrome Extensionの場合
if(STYLEV.isChromeExtension){

	//オプションを更新してから実行　TODO: promiseを整理する
	STYLEV.VALIDATOR.updateOptions().then(function() {

		//自動実行の場合
		if(STYLEV.options.ENABLE_AUTO_EXECUTION) {

			//バリデートを実行
			STYLEV.CHROME_EXTENSION.execute();

		//手動実行の場合
		} else {

			//バリデート済の場合は、削除
//			if(STYLEV.isValidated) {

//				STYLEV.VALIDATOR.destroy();
//				STYLEV.isValidated = false;

				//バリデートの場合は、復活
//			} else {
//
//				STYLEV.isValidated = true;
//			}
		}

		//Extension内のリソースへアクセスするためのリソースルートを取得
		STYLEV.VALIDATOR.RESOURCE_ROOT = chrome.runtime.getURL('');
	});


	chrome.storage.onChanged.addListener(function(changes, namespace) {

		if(namespace === 'sync') {

			if(changes.options) {

				//TODO: class変更による検証再実行が嫌なら、監視を停止してトグルする
				if(changes.options.newValue.enableAnimation) {

					STYLEV.VALIDATOR.html.classList.add('stylev-animation');

				} else {

					STYLEV.VALIDATOR.html.classList.remove('stylev-animation');
				}

			}
		}
	});
}

//ブックマークレット
if(STYLEV.isBookmarklet) {

	//初期読込の場合
	if(STYLEV.isLoaded) {

		console.info('Style Validator by Bookmarklet.');
		STYLEV.VALIDATOR.execute(STYLEV.VALIDATOR.insertStylesheet);

	//一度実行している場合は、validateのみを実行
	} else if(STYLEV.isReLoaded) {

		console.info('Style Validator by Bookmarklet (ReExecution)');
		STYLEV.VALIDATOR.validate();
	}

}