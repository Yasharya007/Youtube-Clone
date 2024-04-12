import { asyncHandler } from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken};
    }catch(error){
        throw new Error("Something went wrong while generating access and refresh tokens");
    }
}

const registerUser= asyncHandler(async (req,res)=>{
    

    // get user details fromm frontend
    const {fullname,email,username,password}=req.body
    console.log(email);

    // validation - not empty
    if (
        [fullname,email,username,password].some((field)=>
    field?.trim()==="")
    ) {
        throw new Error("All fields are required");
    }

    // check if user is already exists
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){throw new Error("User exist");}

    // check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    let coverImageLoacalPath;
    if(req.files && req.files.coverImage){
        coverImageLoacalPath=req.files?.coverImage[0]?.path;
    }
    // const coverImageLoacalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath)throw new Error("Avatar file is req");

    // upload them to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    // let coverImage;
    // console.log(coverImageLoacalPath);
    const coverImage=await uploadOnCloudinary(coverImageLoacalPath)

    
    if(!avatar){
        throw new Error("avatar is required");
    }

     // create user object - create entry in db
     const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url|| "",
        email,
        password,
        username:username.toLowerCase()
     })
     // remove password and refresh token field from response
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if(!createdUser){
        throw new Error("Something went wrong while creating user")
    }

    // return res 
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )

})

const loginUser=asyncHandler(async (req,res)=>{

    //Take input
    const {email,username,password}=req.body
    console.log(email);
    if(!(username || email)){
        throw new Error("Username or email is required")
    }

    //Find the User
    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new Error("User does not exist")
    }

    //check Password
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new Error("Incorrect Password");
    }

    //access token and refresh token
    const{accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const loggdinUser=await User.findById(user._id).select("-password -refreshToken");
    //send cookie
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggdinUser, accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )

})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})


const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new Error("unauthorized request")
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id);
        if(!user){
            throw new Error("Invalid refresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new Error("Refresh token is expired or used");
        }
    
        const{accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
        const options={
            httpOnly:true,
            secure:true
        }
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                     accessToken,refreshToken:newRefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new Error("Something went wrong bro while generating access token again");
    }

})
// const registerUser=(req,res)=>{
//     res.status(200).json({
//         message:"ok"
//     })
// } 

export {registerUser,loginUser,logoutUser,refreshAccessToken} 