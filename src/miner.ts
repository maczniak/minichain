import { Block, BlockHeader, blockHash } from "./block";
import { bufferToHex } from "./buffer";
import { blockMerkleRoot } from "./merkle";
import { CoinbaseTx, Tx, isNormalTx } from "./tx";
import { Script } from "./types";
import { CoinsView, addCoins } from "./coins";

const BLOCK_REWARD = 50;

export function createNewBlock(txOutScript: Script, txs: Tx[] = [], prevHash = Buffer.alloc(0), coinsview: CoinsView): Block {
    // FIXME: Add the mining fee to the coinbase transaction.
    let view = new CoinsView(coinsview);
    let valueInTotal = 0;
    let valueOutTotal = 0;
    // assume that transactions precede the others that depends on their outputs within a block.
    for (const tx of txs) {
        if (isNormalTx(tx)) {
            for (const txinput of tx.inputs) {
                valueInTotal += view.getCoin(txinput.prevOut).out.value;
            }
            valueOutTotal += tx.valueOut;
            addCoins(view, tx);
        }
    }
    const reward = new CoinbaseTx([{
        value: BLOCK_REWARD + (valueInTotal - valueOutTotal),
        txOutScript
    }]);
    txs = [reward].concat(txs);

    const header: BlockHeader = {
        nonce: 0,
        prevHash,
        merkleRoot: blockMerkleRoot(txs),
        timestamp: new Date()
    };

    let hash: Buffer;
    do {
        header.nonce++;
        hash = blockHash(header);
    } while (!isValidBlockHash(hash));

    console.log(`Mined block ${bufferToHex(hash)}`);
    return { header, txs };
}

function isValidBlockHash(hash: Buffer): boolean {
    const hashStr = bufferToHex(hash);
    return hashStr.startsWith("0x0000");
}
