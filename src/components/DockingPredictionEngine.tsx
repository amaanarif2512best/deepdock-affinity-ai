
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Play, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  prepareLigandPDBQT, 
  prepareReceptorPDBQT, 
  predictWithDeepDock,
  predictWithDeepDTA, 
  predictWithGraphDTA,
  type DeepLearningPrediction
} from "@/utils/dockingUtils";

interface DockingPredictionEngineProps {
  ligandSmiles: string;
  receptorType: string;
  customFasta?: string;
  customPdbData?: string;
  onPredictionComplete: (result: any) => void;
}

const DockingPredictionEngine: React.FC<DockingPredictionEngineProps> = ({
  ligandSmiles,
  receptorType,
  customFasta,
  customPdbData,
  onPredictionComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('DeepDock');
  const [preparationStatus, setPreparationStatus] = useState<{
    ligandPrepared: boolean;
    receptorPrepared: boolean;
  }>({ ligandPrepared: false, receptorPrepared: false });
  const [predictionResults, setPredictionResults] = useState<DeepLearningPrediction | null>(null);

  const handleDockingPrediction = async () => {
    if (!ligandSmiles || (!customFasta && !customPdbData)) {
      toast({
        title: "Missing Input",
        description: "Please provide both ligand SMILES and protein sequence/PDB data.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);

    try {
      // Step 1: Prepare Ligand
      setCurrentStep('Preparing ligand structure...');
      setProgress(20);
      
      const ligandPdbqt = await prepareLigandPDBQT(ligandSmiles);
      setPreparationStatus(prev => ({ ...prev, ligandPrepared: true }));
      
      // Step 2: Prepare Receptor
      setCurrentStep('Preparing receptor structure...');
      setProgress(40);
      
      const receptorPdb = customPdbData || generateReceptorPDB();
      const receptorPdbqt = await prepareReceptorPDBQT(receptorPdb, customFasta);
      setPreparationStatus(prev => ({ ...prev, receptorPrepared: true }));
      
      // Step 3: Deep Learning Prediction
      setCurrentStep(`Running ${selectedModel} deep learning prediction...`);
      setProgress(75);
      
      const proteinSequence = customFasta ? extractSequenceFromFasta(customFasta) : '';
      
      let prediction: DeepLearningPrediction;
      
      if (selectedModel === 'DeepDock') {
        prediction = await predictWithDeepDock(ligandSmiles, proteinSequence);
      } else if (selectedModel === 'DeepDTA') {
        prediction = await predictWithDeepDTA(ligandSmiles, proteinSequence);
      } else {
        prediction = await predictWithGraphDTA(ligandSmiles, proteinSequence);
      }
      
      setPredictionResults(prediction);
      
      // Step 4: Complete
      setCurrentStep('Deep learning analysis complete!');
      setProgress(100);
      
      // Generate final results
      const finalResults = {
        bindingAffinity: prediction.affinityScore,
        confidence: prediction.confidence,
        modelUsed: prediction.modelUsed,
        ligandPdbqt,
        receptorPdbqt,
        preparation: preparationStatus,
        dockingMethod: 'deeplearning',
        metricType: prediction.metricType || 'pKd'
      };
      
      onPredictionComplete(finalResults);
      
      toast({
        title: "Deep Learning Prediction Complete",
        description: `${selectedModel} result: ${prediction.affinityScore.toFixed(2)} ${prediction.metricType || 'pKd'} (${prediction.confidence}% confidence)`,
      });
      
    } catch (error) {
      console.error('Docking prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "An error occurred during deep learning analysis.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const generateReceptorPDB = (): string => {
    // Generate basic PDB structure for custom receptors
    return `HEADER    PROTEIN RECEPTOR
ATOM      1  N   ALA A   1      20.154  16.967  18.849  1.00 20.00           N
ATOM      2  CA  ALA A   1      21.618  17.134  18.669  1.00 20.00           C
ATOM      3  C   ALA A   1      22.354  15.816  18.397  1.00 20.00           C
ATOM      4  O   ALA A   1      21.807  14.734  18.173  1.00 20.00           O
END`;
  };

  const extractSequenceFromFasta = (fasta: string): string => {
    return fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
  };

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          Deep Learning Docking & Affinity Prediction Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        
        {/* Deep Learning Model Selection */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Deep Learning Model</label>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-purple-800">AI-Powered Binding Affinity Prediction</h4>
                <p className="text-sm text-purple-600 mt-1">
                  Deep learning models trained on our curated binding affinity dataset
                </p>
                <div className="mt-2 text-xs text-purple-500">
                  <strong>Input:</strong> Ligand SMILES + Protein FASTA<br/>
                  <strong>Output:</strong> Binding affinity score (pKd) with confidence
                </div>
              </div>
            </div>
          </Card>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select AI Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DeepDock">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepDock (Pretrained)</span>
                    <span className="text-xs text-gray-500">Trained on our curated dataset</span>
                  </div>
                </SelectItem>
                <SelectItem value="DeepDTA">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepDTA</span>
                    <span className="text-xs text-gray-500">CNN for Drug-Target Affinity</span>
                  </div>
                </SelectItem>
                <SelectItem value="GraphDTA">
                  <div className="flex flex-col">
                    <span className="font-medium">GraphDTA</span>
                    <span className="text-xs text-gray-500">Graph Neural Network</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Preparation Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ligand Preparation</h4>
                <p className="text-sm text-gray-500">Structure optimization</p>
              </div>
              <Badge variant={preparationStatus.ligandPrepared ? "default" : "secondary"}>
                {preparationStatus.ligandPrepared ? "Ready" : "Pending"}
              </Badge>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Receptor Preparation</h4>
                <p className="text-sm text-gray-500">Structure processing</p>
              </div>
              <Badge variant={preparationStatus.receptorPrepared ? "default" : "secondary"}>
                {preparationStatus.receptorPrepared ? "Ready" : "Pending"}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Run Prediction */}
        <div className="text-center">
          <Button 
            onClick={handleDockingPrediction}
            disabled={isRunning || !ligandSmiles || (!customFasta && !customPdbData)}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? `Running ${selectedModel} Analysis...` : `Start ${selectedModel} Prediction`}
          </Button>
          
          {isRunning && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}
        </div>

        {/* Results Display */}
        {predictionResults && (
          <div className="mt-6 space-y-4">
            <Separator />
            <h3 className="text-lg font-semibold">Deep Learning Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <h4 className="font-medium">Binding Affinity</h4>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {predictionResults.affinityScore.toFixed(2)} {predictionResults.metricType || 'pKd'}
                </div>
                <p className="text-sm text-gray-500">{predictionResults.modelUsed} Prediction</p>
              </Card>
              
              <Card className="p-4 text-center">
                <h4 className="font-medium">Confidence Score</h4>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {predictionResults.confidence}%
                </div>
                <p className="text-sm text-gray-500">Model Confidence</p>
              </Card>
            </div>

            {/* Training Dataset Reference */}
            <Card className="p-4">
              <h4 className="font-medium mb-2">Prediction Basis</h4>
              <p className="text-sm text-gray-600">
                This prediction is based on our pretrained model using a curated dataset of 20 protein-ligand 
                complexes with experimentally determined binding affinities ranging from 1.3 to 9.47 pKd.
              </p>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DockingPredictionEngine;
