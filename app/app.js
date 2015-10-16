'use strict';

/**
 * @ngdoc overview
 * @name singleConceptAuthoringApp
 * @description
 * # singleConceptAuthoringApp
 *
 * Main module of the application.
 */
angular
  .module('singleConceptAuthoringApp', [
    /*    'ngAnimate',*/
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'mgcrea.ngStrap',
    'jcs-autoValidate',
    'ngTable',
    'ui.bootstrap',
    'ui.sortable',
    'ang-drag-drop',
    'monospaced.elastic',
    'textAngular',
    'ui.tree',

    //Insert any created modules here. Ideally one per major feature.,
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.project',
    'singleConceptAuthoringApp.projects',
    'singleConceptAuthoringApp.about',
    'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.taxonomyPanel',
    'singleConceptAuthoringApp.searchPanel',
    'singleConceptAuthoringApp.searchModal',
    'singleConceptAuthoringApp.savedList',
    'singleConceptAuthoringApp.taskDetail',
    'singleConceptAuthoringApp.conceptInformationModal'
  ])
  .factory('httpRequestInterceptor', function () {
      return {
        request: function (config) {
          config.headers['Authorization'] = 'Basic c25vd293bDpzbm93b3ds ';
          return config;
        }
      };
    })

  
  .config(function ($rootScopeProvider, $provide, $routeProvider, $modalProvider, $httpProvider) {

    // up the digest limit to account for extremely long depth of SNOMEDCT trees leading to spurious errors
    // this is not an ideal solution, but this is a known edge-case until Angular 2.0 (see https://github.com/angular/angular.js/issues/6440)
    $rootScopeProvider.digestTtl(20);

    $provide.factory('$routeProvider', function () {
      return $routeProvider;
    });
    //intercept requests to add hardcoded authorization header to work around the spring security popup
    $httpProvider.interceptors.push('httpRequestInterceptor');

    // modal providers MUST not use animation
    // due to current angular-ui bug where the
    // animation prevents removal of grey backdrop on close
    $modalProvider.options.animation = false;

    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', function (taRegisterTool, taOptions) {
      // $delegate is the taOptions we are decorating
      // register the tool with textAngular
      taRegisterTool('taxonomy', {
        iconclass: "fa fa-link",
        action: function (scope) {
          window.alert('Not yet functional.  Use input box to access search widget');
          // DOes not work, too easy but had to try :D  scope.openSearchModal();
        }
      });
      // add the button to the default toolbar definition
      taOptions.toolbar[1].push('taxonomy');
      return taOptions;
    }]);

  })

  .run(function ($routeProvider, $rootScope, endpointService, scaService, snowowlService, notificationService, accountService, $cookies, $timeout) {

    // set the default redirect/route
    $routeProvider.otherwise({
      redirectTo: '/home'
    });

    // begin polling the sca endpoint at 10s intervals
    scaService.startPolling(10000);

    // get endpoint information and set route provider options
    endpointService.getEndpoints().then(function (data) {
      $rootScope.endpoints = data.endpoints;
      var accountUrl = data.endpoints.imsEndpoint + 'api/account';
      var imsUrl = data.endpoints.imsEndpoint;
      var imsUrlParams = '?serviceReferer=' + window.location.href;

      // don't want either true or false here please!
      $rootScope.loggedIn = null;

      // get the account details
      accountService.getAccount(accountUrl).then(function (account) {

        // get the user preferences (once logged in status confirmed)
        accountService.getUserPreferences().then(function (preferences) {

          // apply the user preferences
          // NOTE: Missing values or not logged in leads to defaults
          accountService.applyUserPreferences(preferences).then(function (appliedPreferences) {

            // check for modification by application routine
            if (appliedPreferences !== preferences) {
              accountService.saveUserPreferences(appliedPreferences);
            }
          })
        });

      }, function (error) {
        // apply default preferences
        accountService.applyUserPreferences(preferences).then(function (appliedPreferences) {

        })
      });

      // add required endpoints to route provider
      $routeProvider
        .when('/login', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'login' + imsUrlParams);
          }
        })
        .when('/logout', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'logout' + imsUrlParams);
          }
        })
        .when('/settings', {
          redirectTo: function () {
            window.location = imsUrl + 'settings' + imsUrlParams;
          }
        })
        .when('/register', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'register' + imsUrlParams);
          }
        });
    });

    ///////////////////////////////////////////
    // Instantiate basic metadata in SnowOwl //
    ///////////////////////////////////////////

    var baseModules = [
      '900000000000207008', '900000000000012004'
    ];

    var baseLanguages = ['en'];

    var baseDialects = ['en-us', 'en-gb'];

    // TODO Leave MAIN here?
    snowowlService.addModules(baseModules, 'MAIN');
    snowowlService.addLanguages(baseLanguages);
    snowowlService.addDialects(baseDialects);

  })
  .controller('AppCtrl', ['$scope', 'rootScope', '$location', function AppCtrl($scope, $rootScope, $location) {
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js';
      }
    });


  }]);
