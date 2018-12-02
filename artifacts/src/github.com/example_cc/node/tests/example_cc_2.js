/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

const shim = require('fabric-shim');
const util = require('util');


function create(stub, args){
        console.info('========= example_cc create =========', args);

        if (args.length !== 2) {
            return  console.log('Incorrect number of arguments. Expecting 2');
        }

        let A = args[0];
        let Aval = args[1];

        console.info('========= example_cc create 2 =========', args);
        console.log(Aval);

        try {
            console.log(Buffer.from(Aval));

        } catch (err) {
          console.log(err);
        }
    }


create(null, [ 'a', '{assetId:12}' ]  );