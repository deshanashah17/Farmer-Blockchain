from algosdk.v2client import algod
from algosdk import mnemonic, account
import os
from dotenv import load_dotenv

load_dotenv()

ALGOD_ADDRESS = os.getenv("ALGORAND_NODE")
ALGOD_TOKEN = ""  # no token needed for algonode

client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)


def get_client():
    return client


def get_account():
    mnemonic_phrase = os.getenv("DEPLOYER_MNEMONIC")
    private_key = mnemonic.to_private_key(mnemonic_phrase)
    address = account.address_from_private_key(private_key)
    return private_key, address