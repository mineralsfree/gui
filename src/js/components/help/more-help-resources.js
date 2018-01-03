import React from 'react';
import PropTypes from 'prop-types';

var createReactClass = require('create-react-class');

var MoreHelp =  createReactClass({
 
  render: function() {
  	
    return (
      <div>
        <h2>More help resources</h2>
         
        <p>If you can't find what you're looking for here, there are other places to find help getting started with Mender:</p>
        <br />

        <p>Visit our <a href="https://docs.mender.io" target="_blank">documentation site</a></p>
        <p>Read our <a href="https://docs.mender.io/troubleshooting" target="_blank">troubleshooting pages</a></p>
        <p>Browse the topic or ask a question on our <a href="https://groups.google.com/a/lists.mender.io/forum/#!forum/mender" target="_blank">mailing list</a></p>
        <p>Read the <a href="https://mender.io/faq" target="_blank">FAQs</a></p>
        <p><a href="mailto:contact@mender.io" target="_blank">Email us</a> with a question</p>
        <p>Submit a bug using <a href="https://tracker.mender.io" target="_blank">our bug tracker</a></p>
      </div>
    )
  }
});


module.exports = MoreHelp;