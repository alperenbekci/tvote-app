import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { contractAbi, contractAddress } from "./Constant/constant";
import Login from "./Components/Login";
import Finished from "./Components/Finished";
import Connected from "./Components/Connected";
import "./App.css";

function formatTime(seconds) {
  const days = Math.floor(Number(seconds) / (24 * 60 * 60));
  const hoursLeft = Math.floor(
    (Number(seconds) - days * 24 * 60 * 60) / (60 * 60)
  );
  const minutesLeft = Math.floor(
    (Number(seconds) - days * 24 * 60 * 60 - hoursLeft * 60 * 60) / 60
  );

  return `${days} days ${hoursLeft} hours ${minutesLeft} minutes left`;
}

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [votingStatus, setVotingStatus] = useState(true);
  const [remainingTime, setRemainingTime] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [number, setNumber] = useState("");
  const [canVote, setCanVote] = useState(true);

  const canVoteCallback = useCallback(async () => {
    const provider = new Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer
    );
    const voteStatus = await contractInstance.voters(await signer.getAddress());
    setCanVote(voteStatus);
  }, []);

  const handleAccountsChanged = useCallback(
    (accounts) => {
      if (accounts.length > 0 && account !== accounts[0]) {
        setAccount(accounts[0]);
        canVoteCallback();
      } else {
        setIsConnected(false);
        setAccount(null);
      }
    },
    [account, canVoteCallback]
  );

  useEffect(() => {
    const fetchCandidates = async () => {
      await getCandidates();
      await getRemainingTime();
      await getCurrentStatus();
    };

    fetchCandidates();
    const interval = setInterval(() => {
      fetchCandidates();
    }, 5000);

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      clearInterval(interval);
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [account, handleAccountsChanged]);

  async function vote() {
    const provider = new Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer
    );

    const tx = await contractInstance.vote(number);
    const receipt = await tx.wait();

    // Check confirmations or other properties in the receipt as needed
    console.log("Confirmations:", receipt.confirmations);

    canVoteCallback();
  }

  async function getCandidates() {
    const provider = new Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer
    );
    const candidatesList = await contractInstance.getAllVotesOfCandiates();
    const formattedCandidates = candidatesList.map((candidate, index) => {
      return {
        index: index,
        name: candidate.name,
        voteCount: candidate.voteCount,
      };
    });
    setCandidates(formattedCandidates);
  }

  async function getCurrentStatus() {
    const provider = new Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer
    );
    const status = await contractInstance.getVotingStatus();
    setVotingStatus(status);
  }

  async function getRemainingTime() {
    const provider = new Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer
    );
    const timeInSeconds = await contractInstance.getRemainingTime();
    setRemainingTime(formatTime(timeInSeconds));
  }

  async function connectToMetamask() {
    if (window.ethereum) {
      try {
        const provider = new Web3Provider(window.ethereum);
        setProvider(provider);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setIsConnected(true);
        canVoteCallback();
      } catch (err) {
        console.error(err);
      }
    } else {
      console.error("Metamask is not detected in the browser");
    }
  }

  function handleNumberChange(e) {
    setNumber(e.target.value);
  }

  return (
    <div className="App">
      {votingStatus ? (
        isConnected ? (
          <Connected
            account={account}
            candidates={candidates}
            remainingTime={remainingTime}
            number={number}
            handleNumberChange={handleNumberChange}
            voteFunction={vote}
            showButton={canVote}
          />
        ) : (
          <Login connectWallet={connectToMetamask} />
        )
      ) : (
        <Finished />
      )}
    </div>
  );
}

export default App;
