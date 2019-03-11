import React from 'react';
import PropTypes from 'prop-types';

import AppStore from '../../stores/app-store';
import AppActions from '../../actions/app-actions';
import Deployments from './deployments';
import Devices from './devices';
import { setRetryTimer, clearAllRetryTimers } from '../../utils/retrytimer';

export default class Dashboard extends React.Component {
  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);
    this.state = this._getInitialState();
  }
  componentWillMount() {
    AppStore.changeListener(this._onChange.bind(this));
  }
  componentWillUnmount() {
    clearInterval(this.timer);
    clearAllRetryTimers();
    AppStore.removeChangeListener(this._onChange.bind(this));
  }
  componentDidMount() {
    var self = this;
    clearAllRetryTimers();
    self.timer = setInterval(() => {
      self._refreshDeployments();
      self._refreshAdmissions();
    }, self.state.refreshDeploymentsLength);
    self._refreshDeployments();
    self._refreshAdmissions();
  }
  _getInitialState() {
    return {
      progress: AppStore.getDeploymentsInProgress(),
      devices: AppStore.getAllDevices(),
      recent: AppStore.getPastDeployments(),
      activity: AppStore.getActivity(),
      refreshDeploymentsLength: 30000,
      showHelptips: AppStore.showHelptips()
    };
  }
  _onChange() {
    this.setState(this._getInitialState());
  }
  _refreshDeployments() {
    var self = this;

    const deploymentErrored = err => {
      console.log(err);
      var errormsg = err.error || 'Please check your connection';
      setRetryTimer(err, 'deployments', `Couldn't load deployments. ${errormsg}`, self.state.refreshDeploymentsLength);
    };

    const pastDeploymentRefresh = AppActions.getPastDeployments(1, 3)
      .then(() => setTimeout(() => self.setState({ doneActiveDepsLoading: true }), 300))
      .catch(err => deploymentErrored(err));
    const inProgressDeploymentRefresh = AppActions.getDeploymentCount('inprogress')
      // this updates header bar
      .then(count => self.setState({ progressCount: count }));
    const inProgressDeploymentRefresh2 = AppActions.getDeploymentsInProgress()
      .then(() => setTimeout(() => self.setState({ donePastDepsLoading: true }), 300))
      .catch(err => deploymentErrored(err));

    return Promise.all([pastDeploymentRefresh, inProgressDeploymentRefresh, inProgressDeploymentRefresh2]);
  }
  _refreshAdmissions() {
    var self = this;
    AppActions.getDeviceCount('pending')
      .then(count => self.setState({ pending: count, doneAdmnsLoading: true }))
      .catch(err => console.log(err));
  }

  _handleClick(params) {
    switch (params.route) {
    case 'deployments':
      var tab = `${params.tab || 'progress'}/`;
      var URIParams = `open=${params.open}`;
      URIParams = params.id ? `${URIParams}&id=${params.id}` : URIParams;
      URIParams = encodeURIComponent(URIParams);
      this.context.router.history.push(`/deployments/${tab}${URIParams}`);
      break;
    case 'devices':
      var filters = params.status ? encodeURIComponent(`status=${params.status}`) : '';
      this.context.router.history.push(`/devices/groups/${filters}`);
      break;
    case 'devices/pending':
      this.context.router.history.push('/devices/pending');
      break;
    default:
      this.context.router.history.push(params.route);
    }
  }

  render() {
    return (
      <div className="dashboard">
        <Devices showHelptips={this.state.showHelptips} clickHandle={params => this._handleClick(params)} />
        <Deployments
          globalSettings={this.props.globalSettings}
          loadingActive={!this.state.doneActiveDepsLoading}
          loadingRecent={!this.state.donePastDepsLoading}
          clickHandle={params => this._handleClick(params)}
          progress={this.state.progress}
          recent={this.state.recent}
        />
      </div>
    );
  }
}
