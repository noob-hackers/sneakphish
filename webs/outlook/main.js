//  flogon.js
//
//  This file contains the script used by Logon.aspx
//
//Copyright (c) 2003-2006 Microsoft Corporation.  All rights reserved.

/// <summary>
/// OnLoad handler for logon page
/// </summary>
window.onload = function ()
{
    // If we are replacing the current window with the logon page, initialize the logon page UI now
    //
    if (a_fRC)
        initLogon();

    // Otherwise we need to find the window to replace with the logon page and redirect that window
    //
    else
        redir();
};

/// <summary>
/// Initializes the logon page
/// </summary>
function initLogon()
{
    try
    {
        //
        // we don't call document.execCommand("ClearAuthenticationCache","false"); anymore. As a part of the Pending-Notification
        // infrastructure, we are making a change to make sure startpage does not get loaded more than once. This solution is cookie
        // based. This execCommand was clearing all cookies in the scenario when a user logged on from a child window during an
        // FBA timeout. We do not want that to happen anymore. If this breaks anything, we may need to consider a different solution.
        //
        // Old Comments:
        // If the "Clear the Authentication Cache" flag is set to true and
        // we are coming from the logoff page , clear the cache. See bug 41770 and 5840 for details.
        //

        // Logoff the S-Mime control.
        //
        LogoffMime();
    }
    catch (e) { }

    // Check for username cookie
    //
    var re = /(^|; )logondata=acc=([0|1])&lgn=([^;]+)(;|$)/;
    var rg = re.exec(document.cookie);

    if (rg)
    {
        // Fill in username, set security to private, and restore the "use basic" selection
        //

        gbid("username").value = rg[3];

        try
        {
            var signInErrorElement = gbid("signInErrorDiv");
            if (signInErrorElement)
            {
                signInErrorElement.focus();
            }
            else
            {
                gbid("password").focus();
            }
        }
        catch (e)
        {}

        if (gbid("chkPrvt") && !gbid("chkPrvt").checked)
        {
            gbid("chkPrvt").click();
        }

        if (rg[2] == "1" && gbid("chkBsc"))	// chkBsc doesn't exist if the request comes from ECP
            gbid("chkBsc").click();

    }
    else
    {
        // The variable g_fFcs is set to false when the password gains focus,
        // so that we don't accidentally set focus to the username field while
        // the user is typing their password
        //
        if (g_fFcs)
        {
            try
            {
                gbid("username").focus();
            }
            catch (e)
            { }
        }
    }

    // OWA Premium currently supports
    // IE 7+, Safari 3+, Firefox 3+ for Windows / Mac
    if (IsOwaPremiumBrowser() && gbid("chkBsc"))	// chkBsc doesn't exist if the request comes from ECP
        gbid("chkBsc").disabled = false;

    // Are cookies enabled?
    //
    var sCN = "cookieTest";

    document.cookie = sCN + "=1";
    var cookiesEnabled = document.cookie.indexOf(sCN + "=") != -1;

    if (cookiesEnabled == false)
    {
        shw(gbid("cookieMsg"));
        hd(gbid("lgnDiv"));
    }

    // Show the public/private warning message
    clkSec();
}


/// <summary>
/// Finds the frame we want to load the logon page into, and then loads it there
/// </summary>
function redir()
{
    var o = window;

    // If we're in a dialog, open a logon window and close the dialog - this
    // basically inlines a version of opnWin() so that we don't need to include
    // uglobal.js in logon.aspx
    //
    try
    {
        if (o.dialogArguments)
        {
            var sWN = new String(Math.round(Math.random() * 100000));
            var sF = "toolbar=0,location=0,directories=0,status=1,menubar=0,scrollbars=1,resizable=1,width=800,height=600";
            var iT = Math.round((screen.availHeight - 600) / 2);
            var iL = Math.round((screen.availWidth - 800) / 2);
            sF += ",top=" + iT + ",left=" + iL;

            // Fix for E12 14838.  Need to open this window from the window that opened us, because opening it from this dialog
            // which we are about to close can cause the auth cookies to not propagate to the window that opened this dialog.
            //
            var op = o.dialogArguments.opener;
            try
            {
                if (op)
                    op.open(a_sCW, sWN, sF);
            }
            catch (e)
            { }

            o.close();
            return;
        }
    }
    catch (e)
    { }

    // The url to redirect to after logon
    //
    var sUrl = a_sUrl;

    // Find the outermost OWA frame
    //
    while (1)
    {
        try
        {
            // Try to move up one window/frame
            //
            if (!(o.frameElement && o.frameElement.ownerDocument))
                break;

            var oF = o.frameElement.ownerDocument.parentWindow || // IE name
                    o.frameElement.ownerDocument.defaultView;     // W3C name

            // If we're not in an OWA/ECP window, we've found the frame to replace
            //
            if (!oF || (!oF.g_fOwa && !oF.g_fEcp))
                break;

            // Move up a frame
            //
            o = oF;

            // We're replacing something other than the current frame,  we'll just
            // log back in to the default start page if the frame doesn't provide a url
            //  for relogon. The frame should provide a global method GetReloadUrl
            // if it wants to keep current state.
            // $NOTES: ECP needs to keep the current frame state after re-logon.
            sUrl = o.GetReloadUrl ? "&url=" + encodeURIComponent(o.GetReloadUrl()) : "";
        }
        // Either we're at the top, or access was denied - either way, stop
        //
        catch (e)
        {
            break;
        }
    }

    // See if the window was opened by another window
    //
    try
    {
        var oW = o.opener;

        // If it was opened by another OWA/ECP window, take it over
        //
        if (oW && (oW.g_fOwa || oW.g_fEcp))
        {
            // Center and resize the window
            //
            var iX = Math.round((screen.availWidth - 800) / 2);
            var iY = Math.round((screen.availHeight - 600) / 2);
            o.moveTo(iX, iY);
            o.resizeTo(800, 600);

            // Close the window after logging in
            //
            sUrl = "&url=" + encodeURIComponent(a_sCW);
        }
    }
    // We don't have access to the opener window, so it couldn't be part of OWA
    //
    catch (e) { }

    // Redirect the window
    //
    if (o.navigate)
        o.navigate(a_sLgn + sUrl);
    else
        o.location = a_sLgn + sUrl;
}

/// <summary>
/// Show an element
/// </summary>
/// <param name="o">Element to show</param>
function shw(o)
{
    o.style.display = "";
}

/// <summary>
/// Hide an element
/// </summary>
/// <param name="o">Element to hide</param>
function hd(o)
{
    o.style.display = "none";
}

/// <summary>
/// OnClick handler for the show private explanation 
/// </summary>
function clkSecExp(id)
{
    var o = gbid(id);

    if (o.tagName == "IMG")
        o = o.parentNode;

    switch (o)
    {
        case gbid("lnkShwSec"):
            hd(gbid("lnkShwSec"));
            shw(gbid("lnkHdSec"));
            shw(gbid("prvtExp"));
            gbid("lnkHdSec").focus();
            break;
        case gbid("lnkHdSec"):
            shw(gbid("lnkShwSec"));
            hd(gbid("lnkHdSec"));
            hd(gbid("prvtExp"));
            gbid("lnkShwSec").focus();
            break;
    }
}

/// <summary>
/// onkeydown handler for the show private explanation 
/// </summary>
function kdSecExp(id)
{
    // When user press space bar, we shall treat it as click.
    if (window.event.keyCode == 32)
    {
        clkSecExp(id);
    }
}

/// <summary>
/// OnClick handler for the security radio buttons
/// </summary>
function clkSec()
{
    if (gbid("chkPrvt") == null) {

        // If the private checkbox is not present in the page there is nothing we should do here
        //
        return;
    }

    // Display/hide the warning message
    //
    var c = gbid("chkPrvt").checked;

    gbid("prvtWrn").style.display = c ? "" : "none";

    // Update flags and username cookie
    //
    if (c)
    {
        document.logonForm["flags"].value |= 4;
    }
    else
    {
        document.logonForm["flags"].value &= ~4;

        // Remove the cookie by expiring it
        //
        var oD = new Date();
        oD.setTime(oD.getTime() - 9999);
        document.cookie = "logondata=; expires=" + oD.toUTCString();
        document.cookie = "PrivateComputer=; path=/; expires=" + oD.toUTCString();
    }
}

/// <summary>
/// OnClick handler for the use owa basic checkbox
/// </summary>
function clkBsc()
{
    // Display/hide the warning message
    //
    var c = gbid("chkBsc").checked;
    gbid("bscExp").style.display = c ? "" : "none";

    if (c)
        document.logonForm.flags.value |= 1;
    else
        document.logonForm.flags.value &= ~1;
}

function checkSubmit(e) {
    if (e && e.keyCode == 13) {
        // Since we are explicitly handling the click prevent the default implicit submit  
        if (e.preventDefault) {
            e.preventDefault();
        }

        clkLgn();
    }
} 


/// <summary>
/// OnClick handler for the logon button
/// </summary>
function clkLgn()
{
    // Add performance marker for Logon page as the item name defined in the spec:
    // http://exweb/14/Specs/E14 Spec Library/Client side perf marker definition.xlsx
    //
    addPerfMarker("Logon.Start");

    var p = false;

    if (gbid("chkPrvt")) {
        p = p | gbid("chkPrvt").checked;
    }
    else
    {
        p = true;
    }

    // If security is set to private, add a cookie to persist username and basic setting
    // Cookie format: logondata=acc=<1 or 0>&lgn=<username>
    //
    if (p)
    {
        // Calculate the expires time for two weeks
        //
        var oD = new Date();
        oD.setTime(oD.getTime() + 2 * 7 * 24 * 60 * 60 * 1000);
        var sA = "acc=" + (gbid("chkBsc") && gbid("chkBsc").checked ? 1 : 0);
        var sL = "lgn=" + gbid("username").value;
        document.cookie = "logondata=" + sA + "&" + sL + "; expires=" + oD.toUTCString();
        document.cookie = "PrivateComputer=true; path=/; expires=" + oD.toUTCString();
    }

    if (gbid("showPasswordCheck").checked)
    {
        passwordElement = gbid("password");
        passwordTextElement = gbid("passwordText");
        passwordElement.value = passwordTextElement.value;
    }

    // We clean the post back cookie in order to indicate that the credentials post is legitimate (and not history postback)
    //
    document.cookie = "PBack=0; path=/";
    document.logonForm.submit();
}

/// <summary>
/// OnClick handler for the retry button
/// </summary>
function clkRtry()
{
    window.location.reload();
}

/// <summary>
/// OnClick handler for the ok button after changing password (will go to owa/)
/// </summary>
function clkReLgn()
{
    window.location.href = '../';
}

/// <summary>
/// GetElementByID from Document
/// </summary>
/// <param name="s">Id of the Element</param>
function gbid(s)
{
    return document.getElementById(s);
}

/// <summary>
/// Is the Client IE 7, Safari 3, Firefox 3 or Above
/// Note The rules should match owa\bin\core\Utlities.cs@IsDownLevelClient
/// </summary>
function IsOwaPremiumBrowser()
{
    var ua = navigator.userAgent;
    var av = navigator.appVersion;
    var mac = (av.indexOf('Mac') != -1);
    var win = ((av.indexOf('Win') != -1) || (av.indexOf('NT') != -1));

    // If you change the follow browser check logic, change utility.js as well.
    // We have duplicate logic because otherwise logon page must include more code than necessary.
    //
    var ie = (ua.indexOf("MSIE ") != -1);
    var firefox = (ua.indexOf("Firefox/") != -1 && ua.indexOf("Gecko/") != -1 && Array.every);
    var safari = (ua.indexOf("Safari") != -1 && ua.indexOf("WebKit") != -1);
    var version = 2.0;

    if (ie)
    {
        version = parseFloat(ua.replace(/^.*MSIE /, ''));
    }
    else if (firefox)
    {
        version = parseFloat(ua.replace(/^.*Firefox\//, ''));
    }
    else if (safari)
    {
        version = parseFloat(ua.replace(/^.*Version\//, ''));
    }
    else
    {
        version = parseInt(av);
    }

    if (win)
    {
        if (ie)
            return (version >= 7.0);
        else if (safari)
            return (version >= 3.0);
        else if (firefox)
            return (version >= 3.0);
    }
    else if (mac)
    {
        if (safari)
            return (version >= 2.0);
        else if (firefox)
            return (version >= 3.0);
    }

    return false;
}

/// <summary>
/// Convert an error code to HRESULT.
/// </summary>
function hres(iErr)
{
    return iErr + 0xffffffff + 1;
}

/// <summary>
/// Log off S-MIME control if it presents.
/// </summary>
function LogoffMime()
{
    try
    {
        if ((typeof (mimeLogoffE2k3) != "undefined" && null != mimeLogoffE2k3) && IsMimeCtlInst("MimeBhvr.MimeCtlVer"))
            mimeLogoffE2k3.Logoff();

        if ((typeof (mimeLogoffE2k7SP1) != "undefined" && null != mimeLogoffE2k7SP1) && IsMimeCtlInst("OwaSMime.MimeCtlVer"))
            mimeLogoffE2k7SP1.Logoff();

        if ((typeof (mimeLogoffE2k9) != "undefined" && null != mimeLogoffE2k9) && IsMimeCtlInst("OwaSMime2.MimeCtlVer"))
            mimeLogoffE2k9.Logoff();
    }
    catch (e)
    {
    }
}

/// <summary>
/// Add performance marker which can write ETW trace for clicking logon
/// </summary>
/// <param name="sItemName">Identify string to say start clicking logon</param>
function addPerfMarker(sItemName)
{
    try
    {
        if (window.msWriteProfilerMark)
        {
            window.msWriteProfilerMark(sItemName);
        }
    }
    catch (e)
    {
        // We don't care any exception caused by test code in product, swallow it
    }
}

//
// NOTE: flogon.js does not contain a call to stJS("flogon.js"). This is because flogon.js is loaded at logon time before uglobal.js
//

//-----------------------------------------------------------
// END flogon.js
//-----------------------------------------------------------


	<!--
	var a_fRC = 1;
	var g_fFcs = 1;
	var a_fLOff = 0;
	var a_fCAC = 0;
	var a_fEnbSMm = 0;
/// <summary>
/// Is Mime Control installed?
/// </summary>
function IsMimeCtlInst(progid)
{
	if (!a_fEnbSMm)
		return false;

	var oMimeVer = null;

	try 
	{
		// TODO: ingore this on none IE browser
		//
		//oMimeVer = new ActiveXObject(progid);
	} 
	catch (e)
	{ 
	}

	if (oMimeVer != null)
		return true;
	else
		return false;
}

/// <summary>
/// Render out the S-MIME control if it is installed.
/// </summary>
function RndMimeCtl()
{
	if (IsMimeCtlInst("MimeBhvr.MimeCtlVer"))
		RndMimeCtlHlpr("MimeNSe2k3", "D801B381-B81D-47a7-8EC4-EFC111666AC0", "MIMEe2k3", "mimeLogoffE2k3");

	if (IsMimeCtlInst("OwaSMime.MimeCtlVer"))
		RndMimeCtlHlpr("MimeNSe2k7sp1", "833aa5fb-7aca-4708-9d7b-c982bf57469a", "MIMEe2k7sp1", "mimeLogoffE2k7sp1");

	if (IsMimeCtlInst("OwaSMime2.MimeCtlVer"))
		RndMimeCtlHlpr("MimeNSe2k9", "4F40839A-C1E5-47E3-804D-A2A17F42DA21", "MIMEe2k9", "mimeLogoffE2k9");
}

/// <summary>
/// Helper function to factor out the rendering of the S/MIME control.
/// </summary>
function RndMimeCtlHlpr(objid, classid, ns, id)
{
	document.write("<OBJECT id='" + objid + "' classid='CLSID:" + classid + "'></OBJECT>");
	document.write("<?IMPORT namespace='" + ns + "' implementation=#" + objid + ">");
	document.write("<" + ns + ":Logoff id='" + id + "' style='display:none'/>");
}
	-->


        var mainLogonDiv = window.document.getElementById("mainLogonDiv");
        var showPlaceholderText = false;
        var mainLogonDivClassName = 'mouse';

        if (mainLogonDivClassName == "tnarrow") {
            showPlaceholderText = true;

            // Output meta tag for viewport scaling
            document.write('<meta name="viewport" content="width = 320, initial-scale = 1.0, user-scalable = no" />');
        }
        else if (mainLogonDivClassName == "twide"){
            showPlaceholderText = true;
        }

        function setPlaceholderText() {
                window.document.getElementById("username").placeholder = "user name";
                window.document.getElementById("password").placeholder = "password";
                window.document.getElementById("passwordText").placeholder = "password";
        }

        function showPasswordClick() {
            var showPassword = window.document.getElementById("showPasswordCheck").checked;
            passwordElement = window.document.getElementById("password");
            passwordTextElement = window.document.getElementById("passwordText");
            if (showPassword)
            {
                passwordTextElement.value = passwordElement.value;
                passwordElement.style.display = "none";
                passwordTextElement.style.display = "inline";
                passwordTextElement.focus();
            }
            else
            {
                passwordElement.value = passwordTextElement.value;
                passwordTextElement.style.display = "none";
                passwordTextElement.value = "";
                passwordElement.style.display = "inline";
                passwordElement.focus();
            }
        }
