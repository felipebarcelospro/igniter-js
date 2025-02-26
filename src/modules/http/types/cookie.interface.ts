
/**
 * Represents the available cookie prefix options.
 * 
 * - "host": Requires that the cookie be sent only to the domain that initially set it.
 * - "secure": Requires that the cookie be sent only over HTTPS.
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#Cookie_prefixes}
 * @example
 * ```ts
 * const prefix: CookiePrefixOptions = "host";
 * // or
 * const prefix: CookiePrefixOptions = "secure";
 * ```
 */
export type CookiePrefixOptions = "host" | "secure";

export type CookieOptions = {
	/**
	 * Domain of the cookie
	 *
	 * The Domain attribute specifies which server can receive a cookie. If specified, cookies are
	 * available on the specified server and its subdomains. If the it is not
	 * specified, the cookies are available on the server that sets it but not on
	 * its subdomains.
	 *
	 * @example
	 * `domain: "example.com"`
	 */
	domain?: string;
	/**
	 * A lifetime of a cookie. Permanent cookies are deleted after the date specified in the
	 * Expires attribute:
	 *
	 * Expires has been available for longer than Max-Age, however Max-Age is less error-prone, and
	 * takes precedence when both are set. The rationale behind this is that when you set an
	 * Expires date and time, they're relative to the client the cookie is being set on. If the
	 * server is set to a different time, this could cause errors
	 */
	expires?: Date;
	/**
	 * Forbids JavaScript from accessing the cookie, for example, through the Document.cookie
	 * property. Note that a cookie that has been created with HttpOnly will still be sent with
	 * JavaScript-initiated requests, for example, when calling XMLHttpRequest.send() or fetch().
	 * This mitigates attacks against cross-site scripting
	 */
	httpOnly?: boolean;
	/**
	 * Indicates the number of seconds until the cookie expires. A zero or negative number will
	 * expire the cookie immediately. If both Expires and Max-Age are set, Max-Age has precedence.
	 *
	 * @example 604800 - 7 days
	 */
	maxAge?: number;
	/**
	 * Indicates the path that must exist in the requested URL for the browser to send the Cookie
	 * header.
	 *
	 * @example
	 * "/docs"
	 * // -> the request paths /docs, /docs/, /docs/Web/, and /docs/Web/HTTP will all match. the request paths /, /fr/docs will not match.
	 */
	path?: string;
	/**
	 * Indicates that the cookie is sent to the server only when a request is made with the https:
	 * scheme (except on localhost), and therefore, is more resistant to man-in-the-middle attacks.
	 */
	secure?: boolean;
	/**
	 * Controls whether or not a cookie is sent with cross-site requests, providing some protection
	 * against cross-site request forgery attacks (CSRF).
	 *
	 * Strict -  Means that the browser sends the cookie only for same-site requests, that is,
	 * requests originating from the same site that set the cookie. If a request originates from a
	 * different domain or scheme (even with the same domain), no cookies with the SameSite=Strict
	 * attribute are sent.
	 *
	 * Lax - Means that the cookie is not sent on cross-site requests, such as on requests to load
	 * images or frames, but is sent when a user is navigating to the origin site from an external
	 * site (for example, when following a link). This is the default behavior if the SameSite
	 * attribute is not specified.
	 *
	 * None - Means that the browser sends the cookie with both cross-site and same-site requests.
	 * The Secure attribute must also be set when setting this value.
	 */
	sameSite?: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
	/**
	 * Indicates that the cookie should be stored using partitioned storage. Note that if this is
	 * set, the Secure directive must also be set.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/Privacy/Privacy_sandbox/Partitioned_cookies
	 */
	partitioned?: boolean;
	/**
	 * Cooke Prefix
	 *
	 * - secure: `__Secure-` -> `__Secure-cookie-name`
	 * - host: `__Host-` -> `__Host-cookie-name`
	 *
	 * `secure` must be set to true to use prefixes
	 */
	prefix?: CookiePrefixOptions;
};
