/**
 * @file auth.route.js
 * @description Authentication routes for Discord OAuth
 */

const crypto = require('crypto');
const passport = require('passport');

function setupAuthRoutes(app) {
    // Discord OAuth login initiation
    app.get('/auth/discord', (req, res, next) => {
        const state = crypto.randomBytes(16).toString('hex');
        req.session.oauthState = state;
        passport.authenticate('discord', { state })(req, res, next);
    });

    // OAuth callback - validates state before completing login
    app.get('/auth/discord/callback', (req, res, next) => {
        if (!req.session.oauthState || req.query.state !== req.session.oauthState) {
            return res.status(403).send('Invalid OAuth state.');
        }
        delete req.session.oauthState;
        next();
    }, passport.authenticate('discord', {
        failureRedirect: '/access-denied'
    }), (req, res) => {
        res.redirect('/');
    });

    // Logout route
    app.get('/logout', (req, res) => {
        req.logout(() => {
            req.session.destroy(() => res.redirect('/'));
        });
    });

    // Access denied page
    app.get('/access-denied', (req, res) => {
        res.status(403).render('error', {
            title: 'Acceso Denegado',
            message: 'No tienes los permisos necesarios para acceder a este panel. Asegúrate de tener el rol de Administrador en el servidor.',
            icon: 'fas fa-lock',
            code: '403',
            redirectUrl: '/logout',
            redirectText: 'Cerrar Sesión'
        });
    });

    // Landing page (redirects to dashboard if authenticated)
    app.get('/', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.render('login', { user: req.user });
    });
}

module.exports = setupAuthRoutes;
