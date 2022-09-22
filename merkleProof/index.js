const { whitelistAddress } = require("./whitelistAddress")
const keccak256 = require("keccak256")
const { MerkleTree } = require("merkletreejs")

//creation of merkle tree
const whitelistAddressLeaves = whitelistAddress.map(x => keccak256(x))
const merkleTree = new MerkleTree(whitelistAddressLeaves, keccak256, {
    sortPairs: true
})

//get root hash
const rootHash = merkleTree.getHexRoot()

module.exports = { merkleTree, rootHash }