'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('taxonomiesComparison', function ($rootScope, $q, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=',
        branch: '=',
        parentBranch: '=',
        view: '=?',
      },
      templateUrl: 'shared/taxonomies-comparison/taxonomiesComparison.html',

      link: function (scope) {

        scope.taskConcept = {};
        scope.taskConcept.conceptId = scope.concept.conceptId;
        scope.taskConcept.fsn = scope.concept.fsn;

        scope.projectConcept = null;
        scope.loadingCompleted = false;
        scope.projectConceptFound = false;
        
        scope.closeTaxonomy = function (isProjectConcept) {
          if (isProjectConcept)  {
            scope.projectConcept = null;
          } else {
            scope.taskConcept = null;
          }
        };

        function intialize() {
          snowowlService.getFullConcept(scope.concept.conceptId, scope.parentBranch).then(function (response){
            scope.projectConcept = {};
            scope.projectConcept.conceptId = response.conceptId;
            scope.projectConcept.fsn = response.fsn;
                     
            scope.loadingCompleted = true;
            scope.projectConceptFound = true;
          }, function (error) {
            if (error.status === 404) {
              scope.loadingCompleted = true;
              scope.projectConceptFound = false;
            } else {
              console.error('Error retrieving concept from project branch');
            }            
          });
        }
        intialize();

      }
    };
  })
;
