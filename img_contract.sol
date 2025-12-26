// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EncodedImageStorage {

    struct Chunk {
        uint256 index; // Index of the chunk
        string data;   // The actual chunk data
    }

    mapping(uint256 => Chunk[]) private encodedImageChunks; // Mapping to store chunks by image ID
    uint256 public nextImageId = 0; // Counter for image IDs

    event ChunkStored(uint256 indexed imageId, uint256 chunkIndex, string chunkData);
    event ImageReconstructed(uint256 indexed imageId, string fullData);

    // Function to store a chunk of an encoded image
    function storeChunk(uint256 imageId, uint256 chunkIndex, string memory chunkData) public {
        encodedImageChunks[imageId].push(Chunk(chunkIndex, chunkData));
        emit ChunkStored(imageId, chunkIndex, chunkData);
    }

    // Function to retrieve all chunks for a specific image ID
    function getChunks(uint256 imageId) public view returns (Chunk[] memory) {
        return encodedImageChunks[imageId];
    }

    // Function to reconstruct the full encoded image
    function reconstructImage(uint256 imageId) public view returns (string memory) {
        Chunk[] memory chunks = encodedImageChunks[imageId];
        string memory fullData = "";

        for (uint256 i = 0; i < chunks.length; i++) {
            fullData = string(abi.encodePacked(fullData, chunks[i].data));
        }

        return fullData;
    }

    // Function to allocate a new image ID
    function createNewImage() public returns (uint256) {
        uint256 imageId = nextImageId;
        nextImageId++;
        return imageId;
    }
}
