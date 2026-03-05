"use client";

import { ClaimFormData, ClaimSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


export default function Claim() {

  const { register, handleSubmit, formState: {errors}} = useForm<ClaimFormData>({
        resolver: zodResolver(ClaimSchema),
    });

  const onSubmit = async (data: ClaimFormData) =>{
        const formData = new FormData();
        formData.append("policyNumber", data.policyNumber);
        formData.append("claimDescription", data.claimDescription);
        formData.append("claimFile", data.claimFile[0]);
        console.log("Form Data:", {
            policyNumber: data.policyNumber,
            claimDescription: data.claimDescription,
            claimFile: data.claimFile[0],
        });
        const res = await fetch("/api/claims", {
        method: "POST",
        body: formData,     
    });      
    const result = await res.json();
    console.log("Response:", result);

    }


  

  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans dark:bg-black">   
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center justify-center bg-white dark:bg-black p-8 rounded-lg shadow-md" >   
        <input {...register("policyNumber")} type="text" placeholder="Policy Number" className="mb-4 p-2 border border-gray-300 rounded w-full" />
        {errors.policyNumber && (
          <p className="text-red-500 text-sm">
            {errors.policyNumber.message}
          </p>
        )}
        <input {...register("claimDescription")} type="text" placeholder="Claim Description" className="mb-4 p-2 border border-gray-300 rounded w-full"/>
           {errors.claimDescription && (
          <p className="text-red-500 text-sm">
            {errors.claimDescription.message}
          </p>
        )}
        <input {...register("claimFile")} type="file" className="mb-4 p-2 border border-gray-300 rounded w-full"/>
        {errors.claimFile && (
          <p className="text-red-500 text-sm">
            {errors.claimFile.message}
          </p>
        )}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit Claim</button>  
    </form>

    </div>
    );

}

