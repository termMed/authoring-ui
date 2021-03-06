'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$q', '$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'terminologyServerService',
    function taxonomyPanelCtrl($q, $scope, $rootScope, $location, $routeParams, metadataService, terminologyServerService) {

      $scope.branch = metadataService.getBranch();

      // initialize with root concept (triggers rendering of full SNOMEDCT hierarchy)
      $scope.rootConcept = null;
      $scope.secondRootConcept = null;
      $scope.languages = [];
      $scope.selectedLanguage = null;
      $scope.stopLoadingTaxonomy = false;

      /**
       * Drag and drop object
       * @param conceptId the concept to be dragged
       * @returns {{id: *, name: null}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        return {id: concept.id, name: concept.fsn};
      };

      // watch for viewTaxonomy events
      $scope.$on('viewTaxonomy', function(event, data) {
        $scope.rootConcept = data.concept;
        $scope.secondRootConcept = null;         
      });

      // watch for viewTaxonomy reder
      $scope.$on('stopLoadingTaxonomy', function(event, data) {
        $scope.stopLoadingTaxonomy = data.stopLoadingTaxonomy;
      });

      $scope.clearConcept = function() {
        $scope.rootConcept = null;
      };

      $scope.dropConcept = function (concept) {
        if (concept) {
          $scope.secondRootConcept = {conceptId: concept.id,fsn: concept.name};
        }       
      };

      $scope.closeTaxonomy = function () {
        $scope.secondRootConcept = null;
      };      

      function initLanguagesDropdown () {
        let usModel = {
          moduleId: '731000124108',
          dialectId: '900000000000509007'
        };

        let noModel = {
          moduleId: '51000202101',
          dialectId: '61000202103'
        };

        let usFSN = {id: '900000000000509007-fsn', label: 'FSN in US'};
        let usPT = {id: '900000000000509007-pt', label: 'PT in US'};
        var internatinalFilter = [];
        internatinalFilter.push(usFSN);
        internatinalFilter.push(usPT);           

        var extensionFilter = [];
        extensionFilter.push(usFSN);
        extensionFilter.push(usPT);

        var isExtension = metadataService.isExtensionSet();

        if (isExtension) {          
          var dialects = metadataService.getAllDialects();
          // Remove 'en-gb' if any
          let gbDialectId = '900000000000508004';
          if (dialects.hasOwnProperty(gbDialectId)) {             
            delete dialects[gbDialectId];
          }

          // us dialect + extension with one dialect
          if (Object.keys(dialects).length === 2 
              && metadataService.getCurrentModuleId() !== usModel.moduleId) {
            for (var key in dialects) {
              if (key !== usModel.dialectId) {
                let languages = dialects[key].split('-');
                var dialect = {id: key, label: 'PT in ' + (languages.length > 1 ? languages[1].toUpperCase() : languages[0].toUpperCase())}
                extensionFilter.push(dialect);
                $scope.selectedLanguage = dialect; // Set PT in extension by default
              }
            }
            $scope.languages = extensionFilter;
          } else if (metadataService.getCurrentModuleId() === usModel.moduleId) {
            // us module
            $scope.languages = internatinalFilter;
            $scope.selectedLanguage = usPT; // Set PT in US by default
          } else {
            // multiple dialects
            for (var key in dialects) {
              if (key !== usModel.dialectId) {
                let languages = dialects[key].split('-');
                var dialect = {id: key, label: 'PT in ' + (languages.length > 1 ? languages[1].toUpperCase() : languages[0].toUpperCase())}
                extensionFilter.push(dialect);               
              }
            }
            $scope.languages = extensionFilter;
            $scope.selectedLanguage = usPT; // Set PT in US by default
          }                
        } else {
          $scope.languages = internatinalFilter;
          $scope.selectedLanguage = usFSN; // Set FSN in US by default
        }
      }      

      // on extension metadata set
      $scope.$on('setExtensionMetadata', function (event, data) {
        initLanguagesDropdown();        
      });

      function initialize () {
        initLanguagesDropdown();
      }
      
      initialize ();

    }]);
