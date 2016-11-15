'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('jsBatchEditing', ['$rootScope', '$compile', '$filter', '$timeout', '$q', 'ngTableParams', 'templateService', 'batchEditingService', 'scaService', 'constraintService', 'notificationService',
    function ($rootScope, $compile, $filter, $timeout, $q, ngTableParams, templateService, batchEditingService, scaService, constraintService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // branch
          branch: '=',

          // task
          task: '='
        },
        templateUrl: 'shared/js-batch-editing/batchEditing.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('js-batch-editing directive');

          var
            hotElem,        // the html element itself
            hot,            // the hands on table object
            hotDebounce     // debounce timer used for async operations
            ;

          scope.viewedConcepts = [];  // concepts opened for editing by user
          scope.templates = []; // available templates

          //
          // HTML Renderers for removal and other user actions
          //

          var deleteControl = function (hotInstance, td, row, col, prop, value) {
            var el = '<a class="glyphicon glyphicon-trash" title="Remove from Batch" ng-click="removeConcept(' + row + ')">' + '</a>';
            var compiled = $compile(el)(scope);
            td.empty();
            td.appendChild(compiled[0]);
            return td;
          }

          var userControls = function (hotInstance, td, row, col, prop, value) {
            console.debug('user controls');
            var els = [
              '<a class="glyphicon glyphicon-edit" title="Edit Full Concept" ng-click="editConcept(' + row + ')">' + '</a>',
              '<a class="md md-save" title="Save Concept" ng-click="saveConcept(' + row + ')">' + '</a>',
              '<a class="md md-school" title="Validate Concept" ng-click="validateConcept(' + row + ')">' + '</a>'
            ];

            td.empty();
            angular.forEach(els, function (el) {
              var compiled = $compile(el)(scope);
              td.appendChild(compiled[0]);
              console.debug('td', td);
            });
            return td;
          };

          //
          // HoT Table Functions
          //

          function createHotTableFromConcepts(concepts) {

            var hotData = [];
            angular.forEach(concepts, function (concept) {
              hotData.push(batchEditingService.getHotRowForConcept(concept));
            });

            hotElem = document.getElementById('hotElem');
            hot = new Handsontable(hotElem, {
              data: hotData,
              colHeaders: true,
              removeRowPlugin: true,

              // columns for CT of X
              columns: [
                {
                  title: ' ',
                  renderer: deleteControl,
                  readOnly: true
                } , // null/empty values render as Excel-style alphabetic title
                // }
                {data: 'conceptId', title: 'ID', readOnly: true},
                {data: 'sctid', title: 'SCTID', readOnly: true},
                {data: 'fsn', title: 'FSN'},
                {
                  data: 'targetSlot_0.target.fsn',
                  title: 'Procedure Site -- direct (attribute)',
                  type: 'autocomplete',
                  source: function (query, process) {

                    $timeout.cancel(hotDebounce);
                    if (query && query.length > 2) {
                      hotDebounce = $timeout(function () {
                        console.debug(hot.getSchema(), hot.getSchema().targetSlot_0);
                        constraintService.getConceptsForValueTypeahead(
                          '405813007 ', query, scope.branch,
                          '<< 442083009 | Anatomical or acquired body structure |')
                          .then(function (concepts) {
                            process(concepts.map(function (c) {
                              return c.fsn.term
                            }));
                          }, function (error) {
                            console.error('error getting typeahead values', error);
                          })
                      }, 500)
                    }

                  }
                }, {
                  title: ' ', // null/empty values render as Excel-style alphabetic title
                  renderer: userControls,
                  readOnly: true
                }]
            })
          }

          function getIndexForColumnName(colName) {
            console.debug('col heade3rs', hot.getColHeader());
            return hot.getColHeader().indexOf(colName);
          }


          //
          // User action functions
          //

          function createTemplateConcepts(template, batchSize) {

            var deferred = $q.defer();

            console.debug('creating template concepts');

            // store the selected template for use by conceptEdit.js
            templateService.selectTemplate(template);

            var concepts = [];
            var promises = [];

            for (var i = 0; i < batchSize; i++) {
              promises.push(templateService.createTemplateConcept(template));
            }

            $q.all(promises).then(function (concepts) {
              deferred.resolve(concepts);
            }, function (error) {
              deferred.reject('Error creating template concepts: ' + error);
            });

            return deferred.promise;


          }


          scope.addBatchConceptsFromTemplate = function (template, batchSize) {

            createTemplateConcepts(template, batchSize).then(function (concepts) {

              // add to the existing batch concepts
              batchEditingService.addBatchConcepts(concepts);

              // weirdly can't seem to actually add rows from format in instantiation, so recreate table
              createHotTableFromConcepts(batchEditingService.getBatchConcepts());
            });
          };

// retrieve and add concept to editing panel
          scope.editConcept = function (row) {
            console.debug('edit row', row, hot.getSourceDataAtRow(row));
            var conceptId = hot.getSourceDataAtRow(row).conceptId; // direct match to column
            var concept = batchEditingService.getBatchConcept(conceptId);
            console.debug('concept for row', concept);
            if (scope.viewedConcepts.filter(function (c) {
                return c.conceptId === concept.conceptId;
              }).length === 0) {
              scope.viewedConcepts.push(concept);
            } else {
              notificationService.sendWarning('Concept already added', 3000);
            }
          };

// update the actual concept from row values
          scope.saveConcept = function (row) {

          };

          scope.removeConcept = function (row) {
            console.debug('remove row', row, hot.getSourceDataAtRow(row));
            var colIndex = getIndexForColumnName('sctid');
            var conceptId = hot.getSourceDataAtRow(row).conceptId; // direct match to column
            batchEditingService.removeBatchConcept(conceptId).then(function() {
              hot.alter('remove-row', row);
              removeViewedConcept(conceptId);
            }, function(error) {
              notificationService.sendError('Unexpected error removing batch concept: ' + error);
            })

          };

          scope.validateConcept = function (row) {

          };

// watch for close events
          scope.$on('conceptEdit.stopEditing', function (event, data) {
            removeViewedConcept(data.conceptId);
          });

          function removeViewedConcept(conceptId) {
            var index;
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                index = i;
              }
            }
            if (index) {
              scope.viewedConcepts.splice(index, 1);
            }
          }

// watch for save events from editing panel
          scope.$on('conceptEdit.conceptChange', function (event, data) {

          });


          //
          // Initialization
          //
          function initialize() {

            console.debug('Batch Editing: initializing');

            // get templates for dropdown
            templateService.getTemplates().then(function (templates) {
              scope.templates = templates;
            });


            // initialize from task
            batchEditingService.initializeFromTask(scope.task).then(function () {

              // create the table from batch concepts (if present)
              createHotTableFromConcepts(batchEditingService.getBatchConcepts());
            })
          }


          scope.$watch('task', function () {
           if (scope.task) {
              initialize();
            }
          });
        }

      }
    }
  ]);
