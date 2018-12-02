let helper = require('./helper.js');


var amqp = require('amqp');
var connection = null;

async function send(data){
    console.log("Submitting");
    await connection.publish("neo4j_work",data,{defaultExchange: "work_exchange"});
    return true
}

async function register(org_name, username) {
    console.log("====Called register");

    connection = amqp.createConnection({ host: 'amqp://guest:guest@rabbitmq.example.com:5672' });

// add this for better debuging
    connection.on('error', function(e) {
        console.log("Error from amqp: ", e);
    });

// Wait for connection to become established.
    connection.on('ready', function () {
        // Use the default 'amq.topic' exchange
        console.log("Ready Connection");
    });


    var client = await helper.getClientForOrg(org_name, username);
    console.log('Successfully got the fabric client for the organization "%s"', org_name);
    var channel = client.getChannel("mychannel");
    if(!channel) {
        let message = util.format('Channel %s was not defined in the connection profile', channelName);
        console.log(message);
        throw new Error(message);
    }
    let peer = channel.getPeer("peer0.org2.example.com");
    // console.log(peer);
    let event_hub = channel.newChannelEventHub(peer);
    var promises = [];
    // using resolve the promise so that result status may be processed
    // under the then clause rather than having the catch clause process
    // the status
    let txPromise = new Promise((resolve, reject) => {
        event_hub.registerBlockEvent((block) => {
                console.log('Successfully received the block event');
                // let event_payload = block.payload.toString('utf8');
                // console.log(block);/
                recordTransactionsFromBlocks(block,"none",()=>{console.log(arguments)})
                // block.data.data["0"].payload.data.actions["0"].payload.chaincode_proposal_payload.input.chaincode_spec.input.args[0].toString("utf8")
                // console.log(block["data"]["data"][0]["payload"]["data"])
            }, (error)=> {
                console.log('Failed to receive the block event ::'+error);
                //this is the callback if something goes wrong with the event registration or processing
                reject(new Error('There was a problem with the eventhub ::'+error));
            },{startBlock:1}
        )

    });
    promises.push(txPromise);
    event_hub.connect(true);
    let response = {
        success: true,
        message: 'Eventhub started'
    };
    return response;
}


async function recordTransactionsFromBlocks(block, source, cb) {
    var no_of_txn = block.data.data.length;
    console.log(no_of_txn);
    for(var i=0;i<no_of_txn;i++){
        var tx_data = block.data.data[i];
        var tx_id = tx_data.payload.header.channel_header.tx_id;
        console.log("Transaction ID is : "+ tx_id);
        // const document = await tx_db.getTransactionByID(tx_id).catch(err => console.log("need to add record"));;
        const document = null;

        if(document==null){
            //transaction doesnot exist, so create the transaction
            var sources = [];
            sources.push(source);
            var txRecord = {
                tx_id: tx_id,
                timestamp: Date.now(),
                tx_object: tx_data.payload.data.actions[0],
                sources: sources,
                status: 0
            };
            // Required variables for filtering.
            var tx = tx_data.payload.data.actions[0];
            // tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value = JSON.parse(tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0].value);
            console.log(tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0]);
            var writeset = tx.payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes[0];
            try{
                // await tx_db.create(txRecord);
                await send(writeset);
                // console.log(send);
                console.log('Successfully added transaction to database.',writeset);
            } catch(err){
                console.log(err);
            }
        } else{
            if (document.sources.indexOf(source) > -1) {
                console.log(document._id+" already listened from same source!");
            } else {
                document.sources.push(source);
                tx_db.update(document, function(err) {
                    if (err) {
                        throw err;
                    }
                    console.log(document._id +" updated");
                });
            }
        }
    }
};


exports.register = register;