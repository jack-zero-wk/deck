'use strict';

const angular = require('angular');

import { AccountService } from 'core/account/AccountService';
import { PipelineConfigService } from 'core/pipeline/config/services/PipelineConfigService';

module.exports = angular
  .module('spinnaker.core.projects.configure.modal.controller', [
    require('../service/project.write.service.js').name,
    require('../service/project.read.service.js').name,
    require('../../modal/wizard/wizardSubFormValidation.service.js').name,
  ])
  .controller('ConfigureProjectModalCtrl', function(
    $scope,
    projectConfig,
    $uibModalInstance,
    $q,
    applicationReader,
    projectWriter,
    projectReader,
    taskMonitorBuilder,
    v2modalWizardService,
    wizardSubFormValidation,
  ) {
    if (!projectConfig.name) {
      projectConfig.name = '';
      projectConfig.config = {
        pipelineConfigs: [],
        applications: [],
        clusters: [],
      };
    }

    projectConfig.config.clusters.forEach(cluster => {
      cluster.useAllApplications = !cluster.applications || !cluster.applications.length;
    });

    this.toggleClusterApplicationOverrides = cluster => {
      cluster.applications = [];
    };

    this.pages = {
      config: require('./projectConfig.modal.html'),
      applications: require('./projectApplications.modal.html'),
      clusters: require('./projectClusters.modal.html'),
      pipelines: require('./projectPipelines.modal.html'),
    };

    this.addApplication = application => {
      $scope.viewState.pipelinesLoaded = false;
      let retriever = PipelineConfigService.getPipelinesForApplication(application);
      retriever.then(
        pipelines => {
          $scope.pipelineConfigOptions[application] = pipelines;
        },
        exception => {
          $scope.viewState.pipelineLoadErrors.push({ application: application, exception: exception });
        },
      );
    };

    this.applicationRemoved = () => {
      // this will be called *after* ui-select sets the pipeline's fields to null, so just clear those out
      $scope.command.config.pipelineConfigs = $scope.command.config.pipelineConfigs.filter(
        pipeline => pipeline.application !== null && pipeline.pipelineConfigId !== null,
      );
      $scope.command.config.clusters.filter(cluster => !cluster.useAllApplications).forEach(cluster => {
        cluster.applications = cluster.applications.filter(app => $scope.command.config.applications.includes(app));
      });
    };

    this.removeCluster = index => {
      $scope.command.config.clusters.splice(index, 1);
    };

    this.addCluster = () => {
      $scope.command.config.clusters.push({ stack: '*', detail: '*', useAllApplications: true });
    };

    this.removePipeline = index => {
      $scope.command.config.pipelineConfigs.splice(index, 1);
    };

    this.addPipeline = () => {
      $scope.command.config.pipelineConfigs.push({ application: $scope.command.config.applications[0] });
    };

    this.addMoreItems = function() {
      $scope.viewState.infiniteScroll.currentItems += $scope.viewState.infiniteScroll.numToAdd;
    };

    this.descriptor = projectConfig.id ? 'Update' : 'Create';

    // Initialization

    $scope.viewState = {
      applicationsLoaded: false,
      pipelinesLoaded: false,
      projectsLoaded: false,
      accountsLoaded: false,
      deleteProject: false,
      pipelineLoadErrors: [],
      infiniteScroll: {
        numToAdd: 20,
        currentItems: 20,
      },
    };

    let configRetriever = [];

    $scope.pipelineConfigOptions = {};

    $scope.command = {
      name: projectConfig.name,
      email: projectConfig.email,
      id: projectConfig.id,
      config: {
        applications: angular.copy(projectConfig.config.applications || []),
        clusters: angular.copy(projectConfig.config.clusters || []),
        pipelineConfigs: angular.copy(projectConfig.config.pipelineConfigs || []),
      },
    };

    $scope.command.config.applications.forEach(application => {
      this.addApplication(application);
      configRetriever.push($scope.pipelineConfigOptions[application]);
    });

    $q.all(configRetriever).then(() => {
      $scope.viewState.pipelinesLoaded = true;
    });

    applicationReader.listApplications().then(applications => {
      $scope.applications = applications.map(application => application.name).sort();
      $scope.viewState.applicationsLoaded = true;
    });

    AccountService.listAccounts().then(accounts => {
      $scope.accounts = accounts;
    });

    $scope.taskMonitor = taskMonitorBuilder.buildTaskMonitor({
      application: null,
      title: null, // will be configured by delete/update call
      modalInstance: $uibModalInstance,
    });

    this.deleteProject = () => {
      var submitMethod = () => projectWriter.deleteProject($scope.command);

      $scope.taskMonitor.onTaskComplete = () => $uibModalInstance.close({ action: 'delete' });
      $scope.taskMonitor.title = 'Deleting ' + $scope.command.name;
      $scope.taskMonitor.submit(submitMethod);
    };

    projectReader.listProjects().then(projects => {
      $scope.projectNames = projects
        .map(project => project.name.toLowerCase())
        .filter(projectName => projectName !== projectConfig.name.toLowerCase());
      $scope.viewState.projectsLoaded = true;
    });

    this.updateProject = () => {
      var submitMethod = () => projectWriter.upsertProject($scope.command);
      let descriptor = $scope.command.id ? 'Updating ' : 'Creating ';

      $scope.taskMonitor.onTaskComplete = () =>
        $uibModalInstance.close({ action: 'upsert', name: $scope.command.name });
      $scope.taskMonitor.title = descriptor + $scope.command.name;

      $scope.taskMonitor.submit(submitMethod);
    };

    this.showSubmitButton = () => {
      return v2modalWizardService.allPagesVisited() && wizardSubFormValidation.subFormsAreValid();
    };

    wizardSubFormValidation
      .config({ scope: $scope, form: 'projectConfigForm' })
      .register({ subForm: 'clustersSubForm', page: 'clusters' })
      .register({ subForm: 'pipelinesSubForm', page: 'pipelines' })
      .register({ subForm: 'configSubForm', page: 'config' })
      .register({ subForm: 'applicationsSubForm', page: 'applications' });

    this.cancel = $uibModalInstance.dismiss;
  });
