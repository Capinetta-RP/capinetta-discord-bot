/**
 * @file security.js
 * @description Security middleware configuration (Helmet, CSP, etc.)
 */

const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Generate a nonce for CSP
 */
function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

/**
 * Configure Content Security Policy with nonce support
 */
function configureCSP() {
    return [
        // Middleware to generate nonce per request
        (req, res, next) => {
            res.locals.nonce = generateNonce();
            next();
        },
        // Helmet CSP configuration
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'", // Still needed for inline styles in some cases
                        "https://fonts.googleapis.com",
                        "https://cdnjs.cloudflare.com"
                    ],
                    fontSrc: [
                        "'self'",
                        "https://fonts.gstatic.com",
                        "https://cdnjs.cloudflare.com",
                        "data:"
                    ],
                    scriptSrc: [
                        "'self'",
                        (req, res) => `'nonce-${res.locals.nonce}'`, // Dynamic nonce
                        "https://cdn.jsdelivr.net"
                    ],
                    scriptSrcAttr: ["'none'"], // Removed unsafe-inline
                    imgSrc: [
                        "'self'",
                        "https://cdn.discordapp.com",
                        "data:"
                    ],
                    connectSrc: [
                        "'self'",
                        "https://cdn.jsdelivr.net"
                    ],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"]
                }
            },
            frameguard: {
                action: 'deny'
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        })
    ];
}

module.exports = {
    configureCSP,
    generateNonce
};
