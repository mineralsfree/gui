import React from 'react';
import renderer from 'react-test-renderer';
import PasswordInput from './passwordinput';
import { undefineds } from '../../../../../tests/mockData';

describe('PasswordInput Component', () => {
  it('renders correctly', async () => {
    const tree = renderer.create(<PasswordInput attachToForm={() => {}} id="test" create={true} />).toJSON();
    expect(tree).toMatchSnapshot();
    expect(JSON.stringify(tree)).toEqual(expect.not.stringMatching(undefineds));
  });
});
