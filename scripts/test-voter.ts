import { network } from "hardhat";

const { viem } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});


const publicClient = await viem.getPublicClient();
const [admin, senderClient1, senderClient2, senderClient3] = await viem.getWalletClients();


const main = async () => {
    const votingContract = await viem.deployContract("VotingContract");
    const result = await votingContract.write.registerCandidate(["zenmi"]);
    console.log()
}


