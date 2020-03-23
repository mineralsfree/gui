import React from 'react';
import { connect } from 'react-redux';
import pluralize from 'pluralize';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core';
import { Delete as DeleteIcon } from '@material-ui/icons';

import CreateGroup from './create-group';
import AuthorizedDevices from './authorized-devices';
import Groups from './groups';
import {
  addDeviceToGroup,
  getAllDevicesByStatus,
  getDevices,
  getDevicesByStatus,
  getGroups,
  getGroupDevices,
  removeDeviceFromGroup,
  selectGroup,
  selectDevices,
  setDeviceFilters,
  trySelectDevice
} from '../../actions/deviceActions';
import { setSnackbar } from '../../actions/appActions';

import * as DeviceConstants from '../../constants/deviceConstants';
import { isEmpty, preformatWithRequestID } from '../../helpers';
import { setRetryTimer, clearAllRetryTimers } from '../../utils/retrytimer';

const refreshDeviceLength = 10000;

export class DeviceGroups extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      createGroupDialog: false,
      groupInvalid: true,
      loading: true,
      modifyGroupDialog: false,
      pageNo: 1,
      pageLength: 20,
      removeGroup: false,
      tmpDevices: []
    };
    if (!this.props.acceptedDevicesList.length && this.props.acceptedDevices < this.props.deploymentDeviceLimit) {
      this.props.getAllDevicesByStatus(DeviceConstants.DEVICE_STATES.accepted);
    }
  }

  componentDidMount() {
    var self = this;
    if (self.props.acceptedDevicesList.length < 20) {
      self._getDevices();
    } else {
      self.props.selectDevices(self.props.acceptedDevicesList);
    }
    clearAllRetryTimers(self.props.setSnackbar);
    if (self.props.filters) {
      self._refreshGroups();
    } else {
      clearInterval(self.deviceTimer);
      // no group, no filters, all devices
      self.deviceTimer = setInterval(() => self._getDevices(), refreshDeviceLength);
      self._refreshAll();
    }
  }

  componentWillUnmount() {
    clearInterval(this.deviceTimer);
    clearAllRetryTimers(this.props.setSnackbar);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selectedGroup !== this.props.selectedGroup) {
      this._refreshGroups();
    }
    if (this.props.currentTab !== 'Device groups') {
      clearInterval(this.deviceTimer);
    }
    if (prevProps.filters !== this.props.filters || prevProps.groupCount !== this.props.groupCount || prevProps.selectedGroup !== this.props.selectedGroup) {
      clearInterval(this.deviceTimer);
      if (this.props.currentTab === 'Device groups') {
        this.deviceTimer = setInterval(() => this._getDevices(), refreshDeviceLength);
        this._refreshAll();
      }
    }
  }

  _refreshAll() {
    this._refreshGroups();
    this._getDevices();
  }

  /*
   * Groups
   */
  _refreshGroups(cb) {
    var self = this;
    self.props
      .getGroups()
      .then(() => {
        if (cb) {
          cb();
        }
      })
      .catch(err => console.log(err));
  }

  _handleGroupChange(group) {
    var self = this;
    if (group === DeviceConstants.UNGROUPED_GROUP.id || group === DeviceConstants.UNGROUPED_GROUP.name) {
      group = DeviceConstants.UNGROUPED_GROUP.id;
    }
    self.props.selectGroup(group);
    self.setState({ loading: true, pageNo: 1 }, self._getDevices);
  }

  _removeCurrentGroup() {
    var self = this;
    const deviceIds = this.props.groupDevices;
    // returns all group devices ids
    return Promise.all(deviceIds.map((id, index) => self._removeSingleDevice(index, deviceIds.length, id, true)))
      .then(() => {
        self.props.setSnackbar('Group was removed successfully', 5000);
        self.props.selectGroup();
        self.setState({ pageNo: 1, removeGroup: !self.state.removeGroup });
      })
      .catch(err => console.log(err));
  }

  _removeSingleDevice(idx, length, device, isGroupRemoval = false) {
    // remove single device from group
    var self = this;
    return self.props.removeDeviceFromGroup(device, this.props.selectedGroup).then(() => {
      if (idx === length - 1 && !isGroupRemoval) {
        // if isGroupRemoval, whole group is being removed
        self.props.setSnackbar(`The ${pluralize('devices', length)} ${pluralize('were', length)} removed from the group`, 5000);
      }
      return Promise.resolve();
    });
  }

  _isUngroupedGroup(group) {
    if (!group) {
      return false;
    }
    return group === DeviceConstants.UNGROUPED_GROUP.id || group === DeviceConstants.UNGROUPED_GROUP.name;
  }

  /*
   * Devices
   */
  _getDevices() {
    var self = this;
    const {
      currentTab,
      filters,
      getDevices,
      getDevicesByStatus,
      getGroupDevices,
      selectDevices,
      selectedGroup,
      trySelectDevice,
      ungroupedDevices
    } = self.props;
    var hasFilters = filters.length && filters[0].value;

    if (selectedGroup || hasFilters) {
      let request;
      if (selectedGroup) {
        request = self._isUngroupedGroup(selectedGroup) ? Promise.resolve() : getGroupDevices(selectedGroup, true, this.state.pageNo, this.state.pageLength);
      } else {
        const filterId = filters.find(item => item.key === 'id');
        if (filterId) {
          return trySelectDevice(filterId.value);
        }
        request = getDevices(this.state.pageNo, this.state.pageLength, filters, true);
      }
      // if a group or filters, must use inventory API
      return request
        .then(() => {
          if (this._isUngroupedGroup(selectedGroup)) {
            const offset = (self.state.pageNo - 1) * self.state.pageLength;
            const devices = ungroupedDevices.slice(offset, offset + self.state.pageLength);
            selectDevices(devices);
          }
          // only set state after all devices id data retrieved
          self.setState({ loading: false, pageLoading: false });
        })
        .catch(err => {
          console.log(err);
          var errormsg = err.error || 'Please check your connection.';
          self.setState({ loading: false });
          setRetryTimer(err, 'devices', `Devices couldn't be loaded. ${errormsg}`, refreshDeviceLength, self.props.setSnackbar);
        });
    } else {
      // otherwise, show accepted from device adm
      return getDevicesByStatus(DeviceConstants.DEVICE_STATES.accepted, this.state.pageNo, this.state.pageLength, currentTab === 'Device groups')
        .then(() => self.setState({ loading: false, pageLoading: false }))
        .catch(err => {
          console.log(err);
          var errormsg = err.error || 'Please check your connection.';
          self.setState({ loading: false });
          setRetryTimer(err, 'devices', `Devices couldn't be loaded. ${errormsg}`, refreshDeviceLength, self.props.setSnackbar);
        });
    }
  }

  getDeviceById(id) {
    // filter the list to show a single device only
    var self = this;
    // do this via deviceauth not inventory
    return self.props
      .trySelectDevice(id)
      .then(() => self.setState({ pageLoading: false }))
      .catch(err => {
        if (err.res.statusCode === 404) {
          var errormsg = err.error || 'Please check your connection.';
          setRetryTimer(err, 'devices', `Device couldn't be loaded. ${errormsg}`, refreshDeviceLength, self.props.setSnackbar);
        }
      })
      .finally(() => {
        self.setState({ loading: false });
        self.onFilterChange();
      });
  }
  _handlePageChange(pageNo) {
    var self = this;
    self.setState({ pageLoading: true, pageNo: pageNo }, () => {
      self._getDevices();
    });
  }

  // Edit groups from device selection
  _addDevicesToGroup(rows) {
    // (save selected devices in state, open dialog)
    const devices = rows.map(row => this.props.devices[row]);
    this.setState({ tmpDevices: devices, modifyGroupDialog: !this.state.modifyGroupDialog });
  }

  _createGroupFromDialog(devices, group) {
    var self = this;
    group = encodeURIComponent(group);
    return Promise.all(devices.map(deviceId => self.props.addDeviceToGroup(group, deviceId)))
      .then(() => {
        // reached end of list
        self.setState({ createGroupDialog: false, modifyGroupDialog: false, tmpGroup: '', selectedField: '' }, () => {
          self.props.setSnackbar('The group was updated successfully', 5000);
          self._refreshGroups(() => self._handleGroupChange(group));
        });
      })
      .catch(err => {
        console.log(err);
        var errMsg = err.res.body.error || '';
        self.props.setSnackbar(preformatWithRequestID(err.res, `Group could not be updated: ${errMsg}`), null, 'Copy to clipboard');
      });
  }

  _removeDevicesFromGroup(rows) {
    var self = this;
    clearInterval(self.deviceTimer);
    const isGroupRemoval = rows.length >= self.props.groupCount;
    const isPageRemoval = self.props.devices.length === rows.length;
    const refresh = () => self._refreshAll();
    const deviceRemovals = rows.map((row, i) => self._removeSingleDevice(i, rows.length, self.props.devices[row], isGroupRemoval));
    return Promise.all(deviceRemovals)
      .then(() => {
        // if rows.length = number on page but < groupCount
        // move page back to pageNO 1
        if (isPageRemoval) {
          self.setState({ pageNo: 1, pageLoading: true }, refresh);
        }
        // if rows.length === groupCount
        // group now empty, go to all devices
        if (isGroupRemoval) {
          self.props.setSnackbar('Group was removed successfully', 5000);
          self.props.getGroups();
          self._handleGroupChange();
        }
      })
      .catch(err => console.log(err));
  }

  onFilterChange() {
    var self = this;
    clearInterval(self.deviceTimer);
    self.setState({ pageNo: 1 }, () => {
      clearInterval(self.deviceTimer);
      self.deviceTimer = setInterval(() => self._getDevices(), refreshDeviceLength);
      self._getDevices();
    });
  }

  _pauseInterval() {
    this.props.pause();
    var self = this;
    this.setState({ pause: !self.state.pause }, () => {
      // pause refresh interval when authset dialog is open, restart when it closes
      clearInterval(self.deviceTimer);
      if (!self.state.pause) {
        self.deviceTimer = setInterval(() => self._getDevices(), refreshDeviceLength);
        self._refreshAll();
      }
    });
  }

  render() {
    const self = this;
    const { acceptedDevices, allCount, currentTab, devices, groupCount, groups, openSettingsDialog, paused, selectedGroup, showHelptips } = self.props;

    const { createGroupDialog, modifyGroupDialog, tmpDevices } = self.state;

    var removeActions = [
      <Button key="remove-action-button-1" onClick={() => self.setState({ removeGroup: !self.state.removeGroup })} style={{ marginRight: '10px' }}>
        Cancel
      </Button>,
      <Button variant="contained" key="remove-action-button-2" color="primary" onClick={() => this._removeCurrentGroup()}>
        Remove group
      </Button>
    ];

    const groupName = this._isUngroupedGroup(selectedGroup) ? DeviceConstants.UNGROUPED_GROUP.name : selectedGroup;
    const allowDeviceGroupRemoval = !this._isUngroupedGroup(selectedGroup);

    return (
      <div className="tab-container">
        <div className="leftFixed">
          <Groups
            acceptedCount={acceptedDevices}
            allCount={allCount}
            changeGroup={group => this._handleGroupChange(group)}
            groups={groups}
            openGroupDialog={() => self.setState({ createGroupDialog: !createGroupDialog })}
            selectedGroup={selectedGroup}
            showHelptips={showHelptips}
          />
        </div>
        <div className="rightFluid" style={{ paddingTop: '0' }}>
          {selectedGroup && allowDeviceGroupRemoval ? (
            <Button
              style={{ position: 'absolute', top: 0, right: '30px', zIndex: 100 }}
              onClick={() => self.setState({ removeGroup: !self.state.removeGroup })}
              startIcon={<DeleteIcon />}
            >
              Remove group
            </Button>
          ) : null}
          <AuthorizedDevices
            acceptedCount={acceptedDevices}
            addDevicesToGroup={devices => this._addDevicesToGroup(devices)}
            allCount={allCount}
            allowDeviceGroupRemoval={allowDeviceGroupRemoval}
            currentTab={currentTab}
            devices={devices}
            group={groupName}
            groupCount={groupCount}
            loading={this.state.loading}
            onChangeRowsPerPage={pageLength => self.setState({ pageNo: 1, pageLength }, () => self._handlePageChange(1))}
            onFilterChange={() => self.onFilterChange()}
            onPageChange={e => self._handlePageChange(e)}
            openSettingsDialog={openSettingsDialog}
            pageNo={self.state.pageNo}
            pageLength={self.state.pageLength}
            pause={() => this._pauseInterval()}
            refreshDevices={() => self._getDevices()}
            selectDeviceById={id => self.getDeviceById(id)}
            paused={paused}
            removeDevicesFromGroup={rows => this._removeDevicesFromGroup(rows)}
          />
        </div>

        {this.state.removeGroup && (
          <Dialog open={this.state.removeGroup}>
            <DialogTitle>Remove this group?</DialogTitle>
            <DialogContent>
              <p>This will remove the group from the list. Are you sure you want to continue?</p>
            </DialogContent>
            <DialogActions>{removeActions}</DialogActions>
          </Dialog>
        )}

        {(createGroupDialog || modifyGroupDialog) && (
          <CreateGroup
            addListOfDevices={(devices, group) => this._createGroupFromDialog(devices, group)}
            groups={groups}
            isCreation={createGroupDialog}
            selectedDevices={tmpDevices}
            onClose={() => self.setState({ createGroupDialog: false, modifyGroupDialog: false, tmpDevices: [] })}
          />
        )}
      </div>
    );
  }
}

const actionCreators = {
  addDeviceToGroup,
  getAllDevicesByStatus,
  getDevices,
  getDevicesByStatus,
  getGroups,
  getGroupDevices,
  removeDeviceFromGroup,
  selectGroup,
  selectDevices,
  setDeviceFilters,
  setSnackbar,
  trySelectDevice
};

const mapStateToProps = state => {
  let devices = state.devices.selectedDeviceList;
  let groupCount = state.devices.byStatus.accepted.total;
  let selectedGroup;
  let groupDevices = [];
  if (!isEmpty(state.devices.groups.selectedGroup)) {
    selectedGroup = state.devices.groups.selectedGroup;
    groupCount = state.devices.groups.byId[selectedGroup].total;
    groupDevices = state.devices.groups.byId[selectedGroup].deviceIds;
  } else if (!isEmpty(state.devices.selectedDevice)) {
    devices = [state.devices.selectedDevice];
  } else if (!devices.length && !state.devices.filters.length && state.devices.byStatus.accepted.total) {
    devices = state.devices.byStatus.accepted.deviceIds.slice(0, 20);
  }
  const ungroupedDevices = state.devices.groups.byId[DeviceConstants.UNGROUPED_GROUP.id]
    ? state.devices.groups.byId[DeviceConstants.UNGROUPED_GROUP.id].deviceIds
    : [];
  const groups = Object.entries(state.devices.groups.byId)
    .reduce((accu, [key, value]) => {
      if (value.total || value.deviceIds.length) {
        accu.push(key);
      }
      return accu;
    }, [])
    .sort();
  return {
    acceptedDevices: state.devices.byStatus.accepted.total || 0,
    acceptedDevicesList: state.devices.byStatus.accepted.deviceIds.slice(0, 20),
    allCount: state.devices.byStatus.accepted.total + state.devices.byStatus.rejected.total || 0,
    devices,
    deploymentDeviceLimit: state.deployments.deploymentDeviceLimit,
    filters: state.devices.filters || [],
    groups,
    groupDevices,
    groupCount,
    selectedGroup,
    showHelptips: state.users.showHelptips,
    ungroupedDevices
  };
};

export default connect(mapStateToProps, actionCreators)(DeviceGroups);
