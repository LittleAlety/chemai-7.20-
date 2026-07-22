
function toggleNotice() {
	var notice = document.getElementById('centralNotice');
	if (!wgNoticeToggleState) {
		notice.className = notice.className.replace('collapsed', 'expanded');
		toggleNoticeCookie('0');
	} else {
		notice.className = notice.className.replace('expanded', 'collapsed');
		toggleNoticeCookie('1');
	}
	wgNoticeToggleState = !wgNoticeToggleState;
}
function toggleNoticeStyle(elems, display) {
	if(elems)
		for(var i=0;i<elems.length;i++)
			elems[i].style.display = display;
}
function toggleNoticeCookie(state) {
	var e = new Date();
	e.setTime( e.getTime() + (7*24*60*60*1000) ); // one week
	var work='hidesnmessage='+state+'; expires=' + e.toGMTString() + '; path=/';
	document.cookie = work;
}
function pickTemplate(templates, weights) {
	var weightedTemplates = new Array();
	var currentTemplate = 0;
	var totalWeight = 0;

	if (templates.length == 0)
		return '';

	while (currentTemplate < templates.length) {
		totalWeight += weights[currentTemplate];
		for (i=0; i<weights[currentTemplate]; i++) {
			weightedTemplates[weightedTemplates.length] = templates[currentTemplate];
		}
		currentTemplate++;
	}
	
	if (totalWeight == 0)
		return '';

	var randomnumber=Math.floor(Math.random()*totalWeight);
	return weightedTemplates[randomnumber];
}


var wgNoticeToggleState = (document.cookie.indexOf('hidesnmessage=1')==-1);
document.writeln("\x3cstyle type=\"text/css\"\x3e\n#centralNotice .siteNoticeSmall{display:none;}\n#centralNotice .siteNoticeSmallAnon{display:none;}\n#centralNotice .siteNoticeSmallUser{display:none;}\n#centralNotice.collapsed .siteNoticeBig{display:none;}\n#centralNotice.collapsed .siteNoticeSmall{display:block;}\n#centralNotice.collapsed .siteNoticeSmallUser{display:block;}\n#centralNotice.collapsed .siteNoticeSmallAnon{display:block;}\n#centralNotice.anonnotice .siteNoticeSmallUser{display:none !important;}\n#centralNotice.usernotice .siteNoticeSmallAnon{display:none !important;}\n\x3c/style\x3e");

wgNotice=pickTemplate(["\x3c!-- empty --\x3e", "\x3cscript type=\"text/javascript\"\x3e\n/* BEGIN CUSTOM ETHNIO SCRIPT */\nvar wgThrottle=0;if(\'undefined\'==typeof(Ethnio)){Ethnio={};}Ethnio.head=function(element){document.getElementsByTagName(\'head\')[0].appendChild(element);};Ethnio.load_css=function(file){var link=document.createElement(\'link\');link.href=file;link.rel=\'stylesheet\';link.type=\'text/css\';Ethnio.head(link);};Ethnio.observe=function(element,eventName,handler){if(element.addEventListener){element.addEventListener(eventName,handler,false);}else{element.attachEvent(\"on\"+eventName,handler);}};Ethnio.get_cookie=function(cookie_name){var results=document.cookie.match(\'(^|;) ?\'+cookie_name+\'=([^;]*)(;|$)\');if(results){return(unescape(results[2]));}else{return null;}};Ethnio.set_cookie=function(){var domain=document.domain;var domainString=(domain==\'localhost\'?\'\':\'domain=\'+domain+\';\');var today=new Date();var cookieexpiration=new Date(today.getTime()+30*24*60*60*1000);document.cookie=\"ethnio_displayed=yes; expires=\"+cookieexpiration.toGMTString()+\";path=/;\"+domainString;};Ethnio.currently_displayed=function(){return(document.getElementById(\'ethnio-screener\')!=null);};Ethnio.previously_displayed=function(){return(Ethnio.get_cookie(\'ethnio_displayed\')==\'yes\');};Ethnio.wheel_of_fortune=function(){var wedge=Math.floor(Math.random()*wgThrottle);return(wedge==0);};Ethnio.should_display=function(){var active=true;return(active\x26\x26Ethnio.wheel_of_fortune()\x26\x26!Ethnio.currently_displayed()\x26\x26!Ethnio.previously_displayed());};Ethnio.base_url=\'https://ethnio.com\';Ethnio.show=function(){if(Ethnio.should_display()){Ethnio.load_css(Ethnio.base_url+\"/stylesheets/static/remote_reset.css\");Ethnio.screener=document.createElement(\'div\');Ethnio.screener.setAttribute(\'id\',\'ethnio-screener\');Ethnio.screener.style.top=\"66px\";Ethnio.screener.style.left=\"202px\";var close_button=document.createElement(\'a\');close_button.innerHTML=\'\x3cimg style=\"border: 0px\" alt=\"close\" src=\"\'+Ethnio.base_url+\'/images/screener-header.gif\" /\x3e\';close_button.href=\"javascript:Ethnio.close()\";Ethnio.screener.appendChild(close_button);var iframe=document.createElement(\'iframe\');iframe.id=\'ethnio-screener-id-\'+Math.random();iframe.src=Ethnio.base_url+\'/remotes/63162/edit?\';iframe.style.border=0;iframe.frameBorder=0;iframe.setAttribute(\'allowTransparency\',\'true\');iframe.setAttribute(\'scrolling\',\'no\');Ethnio.screener.appendChild(iframe);document.body.appendChild(Ethnio.screener);Ethnio.set_cookie();}};Ethnio.close=function(){document.body.removeChild(Ethnio.screener);};\n/* END CUSTOM ETHNIO SCRIPT */\n/* BEGIN CUSTOM SITE NOTICE SCRIPT */\naddHandler(window,\'load\',function(){if(wgThrottle\x3e0\x26\x26Ethnio.should_display()\x26\x26document.getElementById\x26\x26wgUserName===null){document.getElementById(\'ethnio_pitch\').style.display=\'block\'}});document.write(\'\x3cdiv id=\"ethnio_pitch\" style=\"display:none\" align=\"center\"\x3e\x3ctable cellpadding=\"0\" cellspacing=\"0\" border=\"0\" summary=\"Have an hour to help Wikipedia without leaving your computer?\"\x3e\x3ctr\x3e\x3ctd align=\"left\" nowrap=\"nowrap\" style=\"background-image:url(http://upload.wikimedia.org/centralnotice/enwiki/ethnio/ask-base.png);height:30px;padding-left:14px;padding-right:14px;border:solid 1px #5bb66f;border-right-width:0px;font-size:13px;font-family:sans-serif;font-weight:bold;color:black\"\x3eHave an hour to help Wikipedia without leaving your computer?\x3c/td\x3e\x3ctd width=\"6\" style=\"background-image:url(http://upload.wikimedia.org/centralnotice/enwiki/ethnio/go-start.png);background-position:left center;width:6px;height:32px;\"\x3e\x26nbsp;\x3c/td\x3e\x3ctd align=\"center\" nowrap=\"nowrap\" style=\"text-align:center;background-image:url(http://upload.wikimedia.org/centralnotice/enwiki/ethnio/go-base.png);height:32px;\"\x3e\x3cdiv style=\"padding-left:14px;padding-right:14px;\"\x3e\x3ca href=\"javascript:void( Ethnio.show() );\" style=\"font-size:13px;font-family:sans-serif;font-style:oblique;color:white;text-decoration:none\"\x3eYes, sign me up!\x3c/a\x3e\x3c/div\x3e\x3c/td\x3e\x3ctd width=\"6\" style=\"background-image:url(http://upload.wikimedia.org/centralnotice/enwiki/ethnio/go-end.png);background-position:left center;width:6px;height:32px;\"\x3e\x26nbsp;\x3c/td\x3e\x3c/tr\x3e\x3c/table\x3e\x3c/div\x3e\');\n/* END CUSTOM SITE NOTICE SCRIPT */\n\x3c/script\x3e\n\x3cscript type=\"text/javascript\" src=\"http://upload.wikimedia.org/centralnotice/enwiki/ethnio/throttle.js\" \x3e\x3c/script\x3e", "\x3cstyle type=\"text/css\"\x3e \n/*\nStyles for Notices\n*/\n\n.notice-wrapper-wikimania, .notice-collapsed-wrapper-wikimania {\n    margin: 2px auto 0;\n    width: 100%;\n    padding: 0;\n    font-family: \'Arial\',\'Helvetica\',\'Tahoma\',sans-serif;\n    color: #333;\n    background-color: #ddd;\n    font-size: .9em;\n    font-weight: 200;\n}\n\n.notice-wrapper-wikimania\n{\n    border: 1px solid #bbb;\n    background-color: #fcfcfc;\n    text-align: left;\n    font-size: .9em;\n}\n\n.notice-wrapper-wikimania a\n{\n    color: #006699;\n}\n\n.trans-box\n{\n    text-align: right;\n    font-size: 0.8em;\n    padding: 0;\n    white-space: nowrap;\n}\n\n.toggle-box-wikimania\n{\n    text-align: right;\n    font-size: 0.8em;\n    padding: 0;\n}\n\n.notice-text-wikimania\n{\n    margin: 0 auto 5px;\n    padding: 7px 5px 5px;\n    font-size: 1.2em;\n}\n\n.line-ht-fix\n{\n    line-height: 1em;\n}\n\n#centralNotice.anonnotice .siteNoticeUser \n{\n    display:none !important;\n}\n\n#centralNotice.collapsed .siteNoticeUser\n{\n    display:none;\n}\n\n\x3c/style\x3e\n\n\x3ctable class=\"siteNoticeUser notice-wrapper-wikimania\"\x3e\n\x3ctr\x3e\n \x3ctd\x3e\n  \x3cdiv class=\"notice-text-wikimania\"\x3e\n  The Call for Participation for Wikimania 2009 has been released. \x3ca href=\"http://wikimania2009.wikimedia.org/wiki/Call_for_Participation\"\x3eSubmit your presentations before April 15.\x3c/a\x3e\n  \x3c/div\x3e\n \x3c/td\x3e\n \x3ctd class=\"line-ht-fix\"\x3e\n   \x3cspan class=\"toggle-box-wikimania\"\x3e\n   [\x3ca href=\"#\" onclick=\"toggleNotice();return\nfalse\"\x3eHide\x3c/a\x3e]\n \x3c/span\x3e\x3cbr/\x3e\n  \x3cspan class=\"trans-box\"\x3e\n  [\x3ca href=\"http://meta.wikimedia.org/wiki/Wikimania_2009/CentralNotice\"\x3eHelp us with translations!\x3c/a\x3e]\n  \x3c/span\x3e\n \x3c/td\x3e\n\x3c/tr\x3e\n\x3c/table\x3e\n\x3cdiv class=\"siteNoticeSmallAnon notice-collapsed-wrapper-wikimania\"\x3e\n\x3c/div\x3e"],[80, 20, 100]);
if (wgNotice != '')
wgNotice='<div id="centralNotice" class="' + (wgNoticeToggleState ? 'expanded' : 'collapsed') + ' ' + (wgUserName ? 'usernotice' : 'anonnotice' ) + '">' + wgNotice+'</div>';
