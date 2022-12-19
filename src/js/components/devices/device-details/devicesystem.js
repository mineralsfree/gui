import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@mui/material';
import { makeStyles } from 'tss-react/mui';

import { setSnackbar } from '../../../actions/appActions';
import { getSystemDevices } from '../../../actions/deviceActions';
import { DEVICE_LIST_DEFAULTS } from '../../../constants/deviceConstants';
import { getDemoDeviceAddress, toggle, versionCompare } from '../../../helpers';
import { getDocsVersion, getIdAttribute, getTenantCapabilities } from '../../../selectors';
import { TwoColumnData } from '../../common/configurationobject';
import EnterpriseNotification from '../../common/enterpriseNotification';
import { getHeaders } from '../authorized-devices';
import { routes } from '../base-devices';
import Devicelist from '../devicelist';
import ConnectToGatewayDialog from '../dialogs/connecttogatewaydialog';
import DeviceDataCollapse from './devicedatacollapse';

const useStyles = makeStyles()(theme => ({ container: { maxWidth: 600, marginTop: theme.spacing(), marginBottom: theme.spacing() } }));

export const DeviceSystem = ({
  customColumnSizes,
  columnSelection,
  device,
  devicesById,
  docsVersion,
  getSystemDevices,
  hasFullFiltering,
  idAttribute,
  onConnectToGatewayClick,
  openSettingsDialog,
  setSnackbar
}) => {
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [headerKeys, setHeaderKeys] = useState([]);
  const [page, setPage] = useState(DEVICE_LIST_DEFAULTS.page);
  const [perPage, setPerPage] = useState(DEVICE_LIST_DEFAULTS.perPage);
  const { classes } = useStyles();
  const navigate = useNavigate();

  const { systemDeviceIds = [], systemDeviceTotal = 0 } = device;
  const deviceIp = getDemoDeviceAddress([device]);

  useEffect(() => {
    const columnHeaders = getHeaders(columnSelection, routes.allDevices.defaultHeaders, idAttribute, openSettingsDialog);
    setColumnHeaders(columnHeaders);
    setHeaderKeys(columnHeaders.map(({ attribute: { name, scope } }) => `${name}-${scope}`).join('-'));
  }, [columnSelection, idAttribute.attribute]);

  useEffect(() => {
    getSystemDevices(device.id, { page, perPage });
  }, [device.id, page, perPage]);

  const onDeviceClick = (device = {}) => navigate(`/devices/${device.status}?id=${device.id}&open=true`);

  return (
    <>
      <DeviceDataCollapse title="Mender Gateway">
        <TwoColumnData config={{ 'Server IP': deviceIp }} compact setSnackbar={setSnackbar} />
      </DeviceDataCollapse>
      <DeviceDataCollapse className={classes.container} title="Device system for this gateway">
        <EnterpriseNotification isEnterprise={hasFullFiltering} benefit="see devices connected to your gateway device for easy access" />
        {systemDeviceTotal ? (
          <Devicelist
            customColumnSizes={customColumnSizes}
            columnHeaders={columnHeaders}
            devices={systemDeviceIds.map(id => devicesById[id])}
            deviceListState={{ page, perPage }}
            headerKeys={headerKeys}
            onChangeRowsPerPage={setPerPage}
            onExpandClick={onDeviceClick}
            onResizeColumns={false}
            onPageChange={setPage}
            onSelect={false}
            onSort={i => i}
            pageLoading={false}
            pageTotal={systemDeviceTotal}
          />
        ) : (
          <div className="dashboard-placeholder">
            <p>No devices have been connected to this gateway device yet.</p>
            <div>
              Visit the{' '}
              <a href={`https://docs.mender.io/${docsVersion}get-started/mender-gateway`} target="_blank" rel="noopener noreferrer">
                full Mender Gateway documentation
              </a>{' '}
              to learn how to make the most of the gateway functionality.
            </div>
          </div>
        )}
      </DeviceDataCollapse>
      <div className="flexbox">
        <Button color="secondary" component={Link} to={`/deployments?deviceId=${device.id}&open=true`}>
          Create deployment for this device system
        </Button>
        <Button onClick={onConnectToGatewayClick}>Connect devices</Button>
      </div>
    </>
  );
};

const DeviceSystemTab = ({ docsVersion, device, isPreRelease, tenantToken, ...remainder }) => {
  const [open, setOpen] = useState(false);
  const gatewayIp = getDemoDeviceAddress([device]);
  const toggleDialog = () => setOpen(toggle);
  return (
    <>
      <DeviceSystem device={device} docsVersion={docsVersion} onConnectToGatewayClick={toggleDialog} {...remainder} />
      {open && (
        <ConnectToGatewayDialog docsVersion={docsVersion} gatewayIp={gatewayIp} isPreRelease={isPreRelease} onCancel={toggleDialog} tenantToken={tenantToken} />
      )}
    </>
  );
};

const actionCreators = { getSystemDevices, setSnackbar };

const mapStateToProps = state => {
  return {
    customColumnSizes: state.users.customColumns,
    devicesById: state.devices.byId,
    docsVersion: getDocsVersion(state),
    hasFullFiltering: getTenantCapabilities(state),
    idAttribute: getIdAttribute(state),
    isPreRelease: versionCompare(state.app.versionInformation.Integration, 'next') > -1,
    tenantToken: state.organization.organization.tenant_token
  };
};

export default connect(mapStateToProps, actionCreators)(DeviceSystemTab);
